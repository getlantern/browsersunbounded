//go:build !wasm

// client_default_impl.go is the entry point for standalone builds for non-wasm build targets
package main

import (
	"log"
	"os"

	"github.com/getlantern/broflake/clientcore"
)

var (
	clientType = "desktop" // Must be "desktop" or "widget"
)

func main() {
	netstated := os.Getenv("NETSTATED")
	tag := os.Getenv("TAG")
	proxyport := os.Getenv("PORT")
	if proxyport == "" {
		proxyport = "1080"
	}

	log.Printf("Welcome to Broflake\n")
	log.Printf("type: %v, netstated: %v, tag: %v, proxyport: %v", clientType, netstated, tag, proxyport)

	bfOpt := clientcore.DefaultBroflakeOptions
	bfOpt.ClientType = clientType
	bfOpt.Netstated = netstated

	rtcOpt := clientcore.DefaultWebRTCOptions
	rtcOpt.Tag = tag

	egOpt := clientcore.DefaultEgressOptions

	bfconn, _, err := clientcore.NewBroflake(&bfOpt, &rtcOpt, &egOpt)
	if err != nil {
		log.Fatal(err)
	}

	if clientType == "desktop" {
		runLocalProxy(proxyport, bfconn)
	}

	select {}
}
