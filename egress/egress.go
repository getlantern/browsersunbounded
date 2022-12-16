package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/elazarl/goproxy"
	"github.com/getlantern/broflake/common"
	"github.com/lucas-clemente/quic-go"
	"nhooyr.io/websocket"
)

// TODO: WSS

// TODO: rate limiters and fancy settings and such:
// https://github.com/nhooyr/websocket/blob/master/examples/echo/server.go

var nClients uint64

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
	nClientsNow := atomic.AddUint64(&nClients, ^uint64(0))
	defer fmt.Printf("Closed a WebSocket connection! (%v total)\n", nClientsNow)
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

// TODO: Someone should scrutinize this
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

	if err != nil {
		// TODO: this is the idiom for our WebSocket library, but we should log the err better
		fmt.Println(err)
		return
	}

	nClientsNow := atomic.AddUint64(&nClients, 1)
	fmt.Printf("Accepted a new WebSocket connection! (%v total)\n", nClientsNow)

	wspconn := websocketPacketConn{
		w:    c,
		addr: common.DebugAddr(fmt.Sprintf("WebSocket connection #%v", nClientsNow)),
	}

	listener, err := quic.Listen(wspconn, l.tlsConfig, &common.QUICCfg)
	if err != nil {
		panic(err)
	}

	go func() {
		for {
			conn, err := listener.Accept(context.Background())
			if err != nil {
				fmt.Printf("%v QUIC listener error (%v), closing!\n", wspconn.addr, err)
				listener.Close()
				defer wspconn.Close()
				return
			}

			fmt.Printf("%v accepted a new QUIC connection!\n", wspconn.addr)

			go func() {
				for {
					stream, err := conn.AcceptStream(context.Background())

					if err != nil {
						// TODO: we interpret an error here as catastrophic failure and we close the QUIC
						// connection, leaving the underlying WebSocket connection open for a new connection.
						errString := fmt.Sprintf("%v stream error (%v), closing QUIC connection!", wspconn.addr, err)
						fmt.Printf("%v\n", errString)
						conn.CloseWithError(quic.ApplicationErrorCode(42069), errString)
						return
					}

					l.connections <- common.QUICStreamNetConn{Stream: stream}
				}
			}()
		}
	}()
}

func main() {
	// We use this wrapped listener to enable our local HTTP proxy to listen for WebSocket connections
	l := proxyListener{
		Listener:    &net.TCPListener{},
		connections: make(chan net.Conn, 2048),
		tlsConfig:   generateTLSConfig(),
	}

	// Instantiate our local HTTP CONNECT proxy
	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true
	fmt.Printf("Starting HTTP CONNECT proxy...\n")

	proxy.OnRequest().DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			fmt.Println("HTTP proxy just saw a request:")
			// TODO: overriding the context is a hack to prevent "context canceled" errors when proxying
			// HTTP (not HTTPS) requests. It's not yet clear why this is necessary -- it may be a quirk
			// of elazarl/goproxy. See: https://github.com/getlantern/broflake/issues/47
			r = r.WithContext(context.Background())
			fmt.Println(r)
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
			// TODO: handle this error gracefully
			panic(err)
		}
	}()

	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Addr:         ":8080",
	}

	http.HandleFunc("/ws", l.handleWebsocket)
	fmt.Printf("Egress server listening for WebSocket connections on %v\n\n", srv.Addr)
	err := srv.ListenAndServe()
	if err != nil {
		fmt.Println(err)
	}
}