package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/elazarl/goproxy"
	"github.com/getlantern/broflake/common"
	"github.com/lucas-clemente/quic-go"
)

const (
	addr = "127.0.0.1:1080"
)

func runLocalProxy() {
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

	proxy.OnRequest().DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			fmt.Println("HTTP proxy just saw a request:")
			fmt.Println(r)
			return r, nil
		},
	)

	go func() {
		fmt.Printf("Starting HTTP CONNECT proxy on %v...\n", addr)
		err := http.ListenAndServe(addr, proxy)
		if err != nil {
			panic(err)
		}
	}()

	for {
		var conn quic.Connection

		// Keep dialing until we establish a connection with the egress server
		for {
			var err error
			conn, err = quic.Dial(bfconn, common.DebugAddr("NELSON WUZ HERE"), "DEBUG", tlsConf, &common.QUICCfg)
			if err != nil {
				fmt.Printf("QUIC dial failed (%v), retrying...\n", err)
				continue
			}

			break
		}

		fmt.Println("QUIC connection established, ready to proxy!")

		// Reconfigure out local HTTP CONNECT proxy to use our new QUIC connection as a transport
		proxy.Tr = &http.Transport{
			Dial: func(network string, addr string) (net.Conn, error) {
				stream, err := conn.OpenStreamSync(context.Background())
				return common.QUICStreamNetConn{Stream: stream}, err
			},
			// goproxy requires this to make things work
			Proxy: func(req *http.Request) (*url.URL, error) {
				return url.Parse("http://i.do.nothing")
			},
		}

		// The egress server doesn't actually open streams to us, this is just how we detect a half open
		_, err := conn.AcceptStream(context.Background())
		if err != nil {
			fmt.Printf("QUIC connection error (%v), closing!\n", err)
			conn.CloseWithError(42069, "")
		}
	}
}
