package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/elazarl/goproxy"
	"github.com/getlantern/broflake/clientcore"
	"github.com/getlantern/broflake/common"
	"github.com/lucas-clemente/quic-go"
)

const (
	ip = "127.0.0.1"
)

type QUICGoproxyRoundTripper struct {
	http.Transport
	conn quic.Connection
	sync.RWMutex
}

func (q *QUICGoproxyRoundTripper) setConn(c quic.Connection) {
	q.Lock()
	defer q.Unlock()
	q.conn = c
}

func (q *QUICGoproxyRoundTripper) dial(network string, addr string) (net.Conn, error) {
	q.RLock()
	defer q.RUnlock()
	stream, err := q.conn.OpenStreamSync(context.Background())
	return common.QUICStreamNetConn{Stream: stream}, err
}

func newQUICGoproxyRoundTripper() *QUICGoproxyRoundTripper {
	q := QUICGoproxyRoundTripper{
		Transport: http.Transport{
			// goproxy requires this to make things work
			Proxy: func(req *http.Request) (*url.URL, error) {
				return url.Parse("http://i.do.nothing")
			},
		},
	}

	q.Transport.Dial = q.dial
	return &q
}

func runLocalProxy(port string, bfconn *clientcore.BroflakeConn) {
	// TODO: this is just to prevent a race with client boot processes, it's not worth getting too
	// fancy with an event-driven solution because the local proxy is all mocked functionality anyway
	<-time.After(2 * time.Second)

	tlsConf := &tls.Config{
		InsecureSkipVerify: true,
		NextProtos:         []string{"broflake"},
	}

	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true
	// This tells goproxy to wrap the dial function in a chained CONNECT request
	proxy.ConnectDial = proxy.NewConnectDialToProxy("http://i.do.nothing")
	rt := newQUICGoproxyRoundTripper()
	proxy.Tr = &rt.Transport

	proxy.OnRequest().DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			log.Println("HTTP proxy just saw a request:")
			log.Println(r)
			return r, nil
		},
	)

	addr := fmt.Sprintf("%v:%v", ip, port)

	go func() {
		log.Printf("Starting HTTP CONNECT proxy on %v...\n", addr)
		err := http.ListenAndServe(addr, proxy)
		if err != nil {
			log.Printf("HTTP CONNECT proxy error: %v\n", err)
		}
	}()

	for {
		var conn quic.Connection

		// Keep dialing until we establish a connection with the egress server
		for {
			var err error
			conn, err = quic.Dial(bfconn, common.DebugAddr("NELSON WUZ HERE"), "DEBUG", tlsConf, &common.QUICCfg)
			if err != nil {
				log.Printf("QUIC dial failed (%v), retrying...\n", err)
				continue
			}

			break
		}

		log.Println("QUIC connection established, ready to proxy!")

		// Reconfigure our local HTTP CONNECT proxy to use our new QUIC connection as a transport
		rt.setConn(conn)

		// The egress server doesn't actually open streams to us, this is just how we detect a half open
		_, err := conn.AcceptStream(context.Background())
		if err != nil {
			log.Printf("QUIC connection error (%v), closing!\n", err)
			conn.CloseWithError(42069, "")
		}
	}
}
