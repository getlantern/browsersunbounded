package main

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
	"os"
	"sync/atomic"
	"time"

	"github.com/elazarl/goproxy"
	"github.com/getlantern/broflake/common"
	"github.com/getlantern/telemetry"
	"github.com/google/uuid"
	"github.com/lucas-clemente/quic-go"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/metric/global"
	"go.opentelemetry.io/otel/metric/instrument"
	"nhooyr.io/websocket"
)

// TODO: rate limiters and fancy settings and such:
// https://github.com/nhooyr/websocket/blob/master/examples/echo/server.go

var nClients uint64
var nQUICStreams uint64

// TODO: it'd be more elegant to use observers rather than counters, such that we could simply
// observe the value of nClients and nQUICStreams instead of duplicating the increment/decrement
// operations. However, the otel observer API seems more complicated than it's worth?
var nClientsCounter instrument.Int64UpDownCounter
var nQUICConnectionsCounter instrument.Int64UpDownCounter
var nQUICStreamsCounter instrument.Int64UpDownCounter

// webSocketPacketConn wraps a websocket.Conn as a net.PacketConn
type websocketPacketConn struct {
	net.PacketConn
	w    *websocket.Conn
	addr net.Addr
}

func (q websocketPacketConn) ReadFrom(p []byte) (n int, addr net.Addr, err error) {
	_, b, err := q.w.Read(context.Background())
	copy(p, b)
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
	connections chan net.Conn
	tlsConfig   *tls.Config
}

func (l proxyListener) Accept() (net.Conn, error) {
	conn := <-l.connections
	return conn, nil
}

func (l proxyListener) Addr() net.Addr {
	return common.DebugAddr("DEBUG NELSON WUZ HERE")
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
		w:    c,
		addr: common.DebugAddr(fmt.Sprintf("WebSocket connection %v", uuid.NewString())),
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

func main() {
	ctx := context.Background()
	closeFuncMetric := telemetry.EnableOTELMetrics(ctx)
	defer func() { _ = closeFuncMetric(ctx) }()

	m := global.Meter("github.com/getlantern/broflake/egress")
	var err error
	nClientsCounter, err = m.Int64UpDownCounter("concurrent-websockets")
	if err != nil {
		panic(err)
	}

	nQUICConnectionsCounter, err = m.Int64UpDownCounter("concurrent-quic-connections")
	if err != nil {
		panic(err)
	}

	nQUICStreamsCounter, err = m.Int64UpDownCounter("concurrent-quic-streams")
	if err != nil {
		panic(err)
	}

	// We use this wrapped listener to enable our local HTTP proxy to listen for WebSocket connections
	l := proxyListener{
		Listener:    &net.TCPListener{},
		connections: make(chan net.Conn, 2048),
		tlsConfig:   generateTLSConfig(),
	}

	// Instantiate our local HTTP CONNECT proxy
	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true
	log.Printf("Starting HTTP CONNECT proxy...\n")

	proxy.OnRequest().DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			log.Println("HTTP proxy just saw a request:")
			// TODO: overriding the context is a hack to prevent "context canceled" errors when proxying
			// HTTP (not HTTPS) requests. It's not yet clear why this is necessary -- it may be a quirk
			// of elazarl/goproxy. See: https://github.com/getlantern/broflake/issues/47
			r = r.WithContext(context.Background())
			log.Println(r)
			return r, nil
		},
	)

	proxy.OnResponse().DoFunc(
		func(r *http.Response, ctx *goproxy.ProxyCtx) *http.Response {
			// TODO: log something interesting?
			return r
		},
	)

	go func() {
		err := http.Serve(l, proxy)
		if err != nil {
			panic(err)
		}
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Addr:         fmt.Sprintf(":%v", port),
	}

	http.Handle("/ws", otelhttp.NewHandler(http.HandlerFunc(l.handleWebsocket), "/ws"))
	log.Printf("Egress server listening for WebSocket connections on %v\n\n", srv.Addr)
	err = srv.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}
