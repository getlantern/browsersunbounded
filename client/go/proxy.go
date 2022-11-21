package main

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/elazarl/goproxy"
	"github.com/getlantern/broflake/clientcore"
)

// LocalProxySource is a clientcore.UserStreamSource
//
// To avoid the complexity of hooking Flashlight during prototype development,
// we mock Flashlight-like functionality by incorporating our own HTTP CONNECT proxy. Our assumption:
// if we can correctly proxy bytestreams originating from our local HTTP proxy now, we'll be able
// to proxy bytestreams originating from Flashlight later.
type LocalProxySource struct {
	addr string
}

func (p *LocalProxySource) InitWithDialer(dial clientcore.DialerFn) {
	proxy := goproxy.NewProxyHttpServer()
	proxy.Verbose = true
	// This tells goproxy to wrap the dial function in a chained CONNECT request
	proxy.ConnectDial = proxy.NewConnectDialToProxy("http://i.do.nothing")

	proxy.Tr = &http.Transport{
		Dial: dial,
		// goproxy requires this to make things work
		Proxy: func(req *http.Request) (*url.URL, error) {
			return url.Parse("http://i.do.nothing")
		},
	}

	proxy.OnRequest().DoFunc(
		func(r *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
			fmt.Println("HTTP proxy just saw a request:")
			fmt.Println(r)
			return r, nil
		},
	)

	fmt.Printf("Starting HTTP CONNECT proxy on %v...\n", p.addr)

	go func() {
		err := http.ListenAndServe(p.addr, proxy)
		if err != nil {
			panic(err)
		}
		// TODO: if this wasn't just mocked functionality, we'd probably want a channel to
		// propagate forward into state 1 over which we could listen for the error returned here...
	}()
}

func NewLocalProxySource(proxyAddr string) *LocalProxySource {
	return &LocalProxySource{addr: proxyAddr}
}
