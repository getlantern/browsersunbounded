package egress

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/lucas-clemente/quic-go"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/metric/global"
	"go.opentelemetry.io/otel/metric/instrument"
	"nhooyr.io/websocket"

	"github.com/getlantern/broflake/common"
	"github.com/getlantern/telemetry"
)

// TODO: rate limiters and fancy settings and such:
// https://github.com/nhooyr/websocket/blob/master/examples/echo/server.go

const (
	websocketKeepalive = 30 * time.Second
)

// Multi-writer values used for logging and otel metrics
// nClients is the number of open WebSocket connections
var nClients uint64

// nQUICStreams is the number of open QUIC streams (not to be confused with QUIC connections)
var nQUICStreams uint64

// nIngressBytes is the number of bytes received over all WebSocket connections since the last otel measurement callback
var nIngressBytes uint64

// Otel instruments
var nClientsCounter instrument.Int64UpDownCounter

// TODO: weirdly, we report the number of open QUIC conections to otel but we don't maintain an atomic value to log it?
var nQUICConnectionsCounter instrument.Int64UpDownCounter
var nQUICStreamsCounter instrument.Int64UpDownCounter
var nIngressBytesCounter instrument.Int64ObservableUpDownCounter

// webSocketPacketConn wraps a websocket.Conn as a net.PacketConn
type websocketPacketConn struct {
	net.PacketConn
	w         *websocket.Conn
	addr      net.Addr
	keepalive time.Duration
}

func (q websocketPacketConn) ReadFrom(p []byte) (n int, addr net.Addr, err error) {
	// TODO: The channel and goroutine we fire off here are used to implement serverside keepalive.
	// For as long as we're reading from this WebSocket, if we haven't received any readable data for
	// a while, we send a ping. Keepalive is only desirable to prevent lots of disconnections
	// and reconnections on idle WebSockets, and so it's worth asking whether the cycles added by this
	// keepalive logic are worth the overhead we're saving in reduced discon/recon loops. Ultimately,
	// we'd rather implement keepalive on the client side, but that's a much bigger lift. See:
	// https://github.com/getlantern/broflake/issues/127
	readDone := make(chan struct{})

	go func() {
		for {
			select {
			case <-time.After(q.keepalive):
				log.Printf("%v PING\n", q.addr)
				q.w.Ping(context.Background())
			case <-readDone:
				return
			}
		}
	}()

	_, b, err := q.w.Read(context.Background())
	readDone <- struct{}{}
	copy(p, b)
	atomic.AddUint64(&nIngressBytes, uint64(len(b)))
	return len(b), common.DebugAddr("DEBUG NELSON WUZ HERE"), err
}

func (q websocketPacketConn) WriteTo(p []byte, addr net.Addr) (n int, err error) {
	err = q.w.Write(context.Background(), websocket.MessageBinary, p)
	return len(p), err
}

func (q websocketPacketConn) Close() error {
	defer log.Printf("Closed a WebSocket connection! (%v total)\n", atomic.AddUint64(&nClients, ^uint64(0)))
	defer nClientsCounter.Add(context.Background(), -1)
	return q.w.Close(websocket.StatusNormalClosure, "")
}

func (q websocketPacketConn) LocalAddr() net.Addr {
	return q.addr
}

type proxyListener struct {
	net.Listener
	connections  chan net.Conn
	tlsConfig    *tls.Config
	addr         net.Addr
	closeMetrics func(ctx context.Context) error
}

func (l proxyListener) Accept() (net.Conn, error) {
	conn := <-l.connections
	return conn, nil
}

func (l proxyListener) Addr() net.Addr {
	return l.addr
}

func (l proxyListener) Close() error {
	err := l.Listener.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	l.closeMetrics(ctx)
	return err
}

func generateTLSConfig() *tls.Config {
	key, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		panic(err)
	}
	template := x509.Certificate{SerialNumber: big.NewInt(1)}
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		panic(err)
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})

	tlsCert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		panic(err)
	}
	return &tls.Config{
		Certificates: []tls.Certificate{tlsCert},
		NextProtos:   []string{"broflake"},
	}
}

func (l proxyListener) handleWebsocket(w http.ResponseWriter, r *http.Request) {
	// TODO: InsecureSkipVerify=true just disables origin checking, we need to instead add origin
	// patterns as strings using AcceptOptions.OriginPattern
	// TODO: disabling compression is a workaround for a WebKit bug:
	// https://github.com/getlantern/broflake/issues/45
	c, err := websocket.Accept(
		w,
		r,
		&websocket.AcceptOptions{
			InsecureSkipVerify: true,
			CompressionMode:    websocket.CompressionDisabled,
		},
	)

	wspconn := websocketPacketConn{
		w:         c,
		addr:      common.DebugAddr(fmt.Sprintf("WebSocket connection %v", uuid.NewString())),
		keepalive: websocketKeepalive,
	}

	defer wspconn.Close()

	if err != nil {
		return
	}

	log.Printf("Accepted a new WebSocket connection! (%v total)\n", atomic.AddUint64(&nClients, 1))
	nClientsCounter.Add(context.Background(), 1)

	listener, err := quic.Listen(wspconn, l.tlsConfig, &common.QUICCfg)
	if err != nil {
		log.Printf("Error creating QUIC listener: %v\n", err)
		return
	}

	for {
		conn, err := listener.Accept(context.Background())
		if err != nil {
			log.Printf("%v QUIC listener error (%v), closing!\n", wspconn.addr, err)
			listener.Close()
			break
		}

		nQUICConnectionsCounter.Add(context.Background(), 1)
		log.Printf("%v accepted a new QUIC connection!\n", wspconn.addr)

		go func() {
			for {
				stream, err := conn.AcceptStream(context.Background())

				if err != nil {
					// We interpret an error while accepting a stream to indicate an unrecoverable error with
					// the QUIC connection, and so we close the QUIC connection altogether
					errString := fmt.Sprintf("%v stream error (%v), closing QUIC connection!", wspconn.addr, err)
					log.Printf("%v\n", errString)
					conn.CloseWithError(quic.ApplicationErrorCode(42069), errString)
					nQUICConnectionsCounter.Add(context.Background(), -1)
					return
				}

				log.Printf("Accepted a new QUIC stream! (%v total)\n", atomic.AddUint64(&nQUICStreams, 1))
				nQUICStreamsCounter.Add(context.Background(), 1)

				l.connections <- common.QUICStreamNetConn{Stream: stream, OnClose: func() {
					defer log.Printf("Closed a QUIC stream! (%v total)\n", atomic.AddUint64(&nQUICStreams, ^uint64(0)))
					nQUICStreamsCounter.Add(context.Background(), -1)
				}}
			}
		}()
	}
}

func NewListener(ctx context.Context, ll net.Listener) (net.Listener, error) {
	closeFuncMetric := telemetry.EnableOTELMetrics(ctx)
	m := global.Meter("github.com/getlantern/broflake/egress")
	var err error
	nClientsCounter, err = m.Int64UpDownCounter("concurrent-websockets")
	if err != nil {
		closeFuncMetric(ctx)
		return nil, err
	}

	nQUICConnectionsCounter, err = m.Int64UpDownCounter("concurrent-quic-connections")
	if err != nil {
		closeFuncMetric(ctx)
		return nil, err
	}

	nQUICStreamsCounter, err = m.Int64UpDownCounter("concurrent-quic-streams")
	if err != nil {
		closeFuncMetric(ctx)
		return nil, err
	}

	nIngressBytesCounter, err = m.Int64ObservableUpDownCounter("ingress-bytes")
	if err != nil {
		closeFuncMetric(ctx)
		return nil, err
	}

	_, err = m.RegisterCallback(
		func(ctx context.Context, o metric.Observer) error {
			b := atomic.LoadUint64(&nIngressBytes)
			o.ObserveInt64(nIngressBytesCounter, int64(b))
			log.Printf("Ingress bytes: %v\n", b)
			atomic.StoreUint64(&nIngressBytes, uint64(0))
			return nil
		},
		nIngressBytesCounter,
	)
	if err != nil {
		closeFuncMetric(ctx)
		return nil, err
	}

	// We use this wrapped listener to enable our local HTTP proxy to listen for WebSocket connections
	l := proxyListener{
		Listener:     &net.TCPListener{},
		connections:  make(chan net.Conn, 2048),
		tlsConfig:    generateTLSConfig(),
		addr:         ll.Addr(),
		closeMetrics: closeFuncMetric,
	}

	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	http.Handle("/ws", otelhttp.NewHandler(http.HandlerFunc(l.handleWebsocket), "/ws"))
	log.Printf("Egress server listening for WebSocket connections on %v\n", ll.Addr())
	go func() {
		err := srv.Serve(ll)
		panic(fmt.Sprintf("stopped listening and serving for some reason: %v", err))
	}()

	return l, nil
}
