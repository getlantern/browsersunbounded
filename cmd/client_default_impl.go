//go:build !wasm

// client_default_impl.go is the entry point for standalone builds for non-wasm build targets
package main

import (
	"log"
	"os"

	"github.com/anacrolix/envpprof"
	"github.com/getlantern/broflake/clientcore"
)

var (
	clientType = "desktop" // Must be "desktop" or "widget"
)

func main() {
	defer envpprof.Stop()
	freddie := os.Getenv("FREDDIE")
	egress := os.Getenv("EGRESS")
	netstated := os.Getenv("NETSTATED")
	tag := os.Getenv("TAG")
	proxyport := os.Getenv("PORT")
	if proxyport == "" {
		proxyport = "1080"
	}

	log.Printf("Welcome to Broflake\n")
	log.Printf("type: %v\n", clientType)
	log.Printf("freddie: %v\n", freddie)
	log.Printf("egress: %v\n", egress)
	log.Printf("netstated: %v\n", netstated)
	log.Printf("tag: %v\n", tag)
	log.Printf("proxyport: %v\n", proxyport)

	bfOpt := clientcore.NewDefaultBroflakeOptions()
	bfOpt.ClientType = clientType
	bfOpt.Netstated = netstated

	rtcOpt := clientcore.NewDefaultWebRTCOptions()
	rtcOpt.Tag = tag

	if freddie != "" {
		rtcOpt.DiscoverySrv = freddie
	}

	egOpt := clientcore.NewDefaultEgressOptions()

	if egress != "" {
		egOpt.Addr = egress
	}

	bfconn, _, err := clientcore.NewBroflake(bfOpt, rtcOpt, egOpt)
	if err != nil {
		log.Fatal(err)
	}

	if clientType == "desktop" {
		runLocalProxy(proxyport, bfconn)
	}

	select {}
}
