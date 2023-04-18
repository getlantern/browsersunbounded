//go:build !wasm

// client_default_impl.go is the entry point for standalone builds for non-wasm build targets
package main

import (
	"crypto/x509"
	"io/ioutil"
	"log"
	"net/http"
	_ "net/http/pprof"
	"os"
	"strconv"

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
	ca := os.Getenv("CA")
	if ca == "" {
		ca = "../../../egress/cmd/dev.crt"
	}
	serverName := os.Getenv("SERVER_NAME")
	if serverName == "" {
		serverName = "localhost"
	}
	insecureSkipVerify := os.Getenv("INSECURE_SKIP_VERIFY")
	if insecureSkipVerify == "" {
		insecureSkipVerify = "false"
	}
	proxyPort := os.Getenv("PORT")
	if proxyPort == "" {
		proxyPort = "1080"
	}

	log.Printf("Welcome to Broflake %v\n", common.Version)
	log.Printf("clientType: %v\n", clientType)
	log.Printf("freddie: %v\n", freddie)
	log.Printf("egress: %v\n", egress)
	log.Printf("netstated: %v\n", netstated)
	log.Printf("tag: %v\n", tag)
	log.Printf("pprof: %v\n", pprof)
	log.Printf("ca: %v\n", ca)
	log.Printf("serverName: %v\n", serverName)
	log.Printf("insecureSkipVerify: %v\n", insecureSkipVerify)
	log.Printf("proxyPort: %v\n", proxyPort)

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
		pem, err := ioutil.ReadFile(ca)
		if err != nil {
			log.Fatal(err)
		}

		isv, err := strconv.ParseBool(insecureSkipVerify)
		if err != nil {
			log.Fatal(err)
		}

		certPool := x509.NewCertPool()
		certPool.AppendCertsFromPEM(pem)
		runLocalProxy(proxyPort, bfconn, certPool, serverName, isv)
	}

	select {}
}
