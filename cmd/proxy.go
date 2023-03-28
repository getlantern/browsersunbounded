package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/elazarl/goproxy"
	"github.com/getlantern/broflake/clientcore"
)

const (
	ip = "127.0.0.1"
)

func runLocalProxy(port string, bfconn *clientcore.BroflakeConn) {
	// TODO: this is just to prevent a race with client boot processes, it's not worth getting too
	// fancy with an event-driven solution because the local proxy is all mocked functionality anyway
	<-time.After(2 * time.Second)
	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true
	// This tells goproxy to wrap the dial function in a chained CONNECT request
	proxy.ConnectDial = proxy.NewConnectDialToProxy("http://i.do.nothing")

	ql, err := clientcore.NewQUICLayer(bfconn, &clientcore.QUICLayerOptions{InsecureSkipVerify: true})
	if err != nil {
		log.Printf("Cannot start local HTTP proxy: failed to create QUIC layer: %v", err)
		return
	}

	ql.DialAndMaintainQUICConnection()
	proxy.Tr = clientcore.CreateHTTPTransport(ql)

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
