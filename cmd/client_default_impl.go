//go:build !wasm

// client_default_impl.go is the entry point for standalone builds for non-wasm build targets
package main

import (
	"log"
	"net/http"
	_ "net/http/pprof"
	"os"

	"github.com/getlantern/broflake/clientcore"
	"github.com/getlantern/broflake/common"
)

var (
	clientType = "desktop" // Must be "desktop" or "widget"
)

func main() {
	pprof := os.Getenv("PPROF")
	freddie := os.Getenv("FREDDIE")
	egress := os.Getenv("EGRESS")
	netstated := os.Getenv("NETSTATED")
	tag := os.Getenv("TAG")
	proxyport := os.Getenv("PORT")
	if proxyport == "" {
		proxyport = "1080"
	}

	log.Printf("Welcome to Broflake %v\n", common.Version)
	log.Printf("type: %v\n", clientType)
	log.Printf("freddie: %v\n", freddie)
	log.Printf("egress: %v\n", egress)
	log.Printf("netstated: %v\n", netstated)
	log.Printf("tag: %v\n", tag)
	log.Printf("pprof: %v\n", pprof)
	log.Printf("proxyport: %v\n", proxyport)

	bfOpt := clientcore.NewDefaultBroflakeOptions()
	bfOpt.ClientType = clientType
	bfOpt.Netstated = netstated

	// For MVP, the browser widget is configured for a concurrency of 10, so we might as well kick
	// the tires on the native binary widget at concurrency 10 too
	if clientType == "widget" {
		bfOpt.CTableSize = 10
		bfOpt.PTableSize = 10
	}

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

	if pprof != "" {
		go func() {
			log.Println(http.ListenAndServe("localhost:"+pprof, nil))
		}()
	}

	if clientType == "desktop" {
		runLocalProxy(proxyport, bfconn)
	}

	select {}
}
