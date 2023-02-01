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

	ql := clientcore.NewQUICLayer(bfconn, &clientcore.QUICOptions{InsecureSkipVerify: true})
	proxy.Tr = CreateHTTPTransport(ql)

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
}
