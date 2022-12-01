package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/elazarl/goproxy"
	"github.com/xtaci/smux"
	"nhooyr.io/websocket"
)

// TODO: WSS

// TODO: rate limiters and fancy settings and such:
// https://github.com/nhooyr/websocket/blob/master/examples/echo/server.go

var nClients uint64

type proxyConn struct {
	net.Conn
}

func (c proxyConn) Close() error {
	atomic.AddUint64(&nClients, ^uint64(0))
	fmt.Printf("Closed a WebSocket connection! (%v total)\n", atomic.LoadUint64(&nClients))
	return c.Conn.Close()
}

type debugAddr string

func (a debugAddr) Network() string {
	return string(a)
}

func (a debugAddr) String() string {
	return string(a)
}

func (c proxyConn) LocalAddr() net.Addr {
	return debugAddr("DEBUG NELSON WUZ HERE")
}

func (c proxyConn) RemoteAddr() net.Addr {
	return debugAddr("DEBUG NELSON WUZ HERE")
}

type proxyListener struct {
	net.Listener
	connections chan net.Conn
}

func (l proxyListener) Accept() (net.Conn, error) {
	conn := <-l.connections
	return conn, nil
}

func (l proxyListener) Addr() net.Addr {
	return debugAddr("DEBUG NELSON WUZ HERE")
}

func (l proxyListener) handleWebsocket(w http.ResponseWriter, r *http.Request) {
	// TODO: InsecureSkipVerify=true just disables origin checking, we need to instead add origin
	// patterns as strings using AcceptOptions.OriginPattern
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		// TODO: this is the idiom for our WebSocket library, but we should log the err better
		fmt.Println(err)
		return
	}

	atomic.AddUint64(&nClients, 1)
	fmt.Printf("Accepted a new WebSocket connection! (%v total)\n", atomic.LoadUint64(&nClients))
	wsconn := proxyConn{Conn: websocket.NetConn(context.Background(), c, websocket.MessageBinary)}

	// The default value for MaxFrameSize (32K) makes the WebSocket library complain about oversized msgs
	// TODO: it's not clear that 16K is optimal, we should run some experiments - and we should fetch
	// these configuration values from the 'common' module to ensure agreement across client and server
	smuxCfg := smux.DefaultConfig()
	smuxCfg.KeepAliveDisabled = true
	smuxCfg.MaxFrameSize = 16384
	err = smux.VerifyConfig(smuxCfg)
	if err != nil {
		panic(err)
	}

	smuxSess, err := smux.Server(wsconn, smuxCfg)

	go func() {
		for {
			stream, err := smuxSess.AcceptStream()
			if err != nil {
				// TODO: we interpret an error here as catastrophic failure and we close the smux session,
				// which in turn closes the underlying WebSocket connection. This seems to work the way
				// we want, providing nice fault recovery characteristics, but we haven't tested it much.
				smuxSess.Close()
				fmt.Printf("Stream error: %v\n", err)
				return
			}

			select {
			case l.connections <- stream:
				// Do nothing, message sent
			default:
				panic("proxyListener.connections buffer overflow!")
			}
		}
	}()
}

func main() {
	// We use this wrapped listener to enable our local HTTP proxy to listen for WebSocket connections
	l := proxyListener{Listener: &net.TCPListener{}, connections: make(chan net.Conn, 2048)}

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
