// client.go is the main entry point for all the client variants
package main

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/getlantern/flashlight/config"
	"github.com/getlantern/flashlight/proxied"
	"github.com/getlantern/fronted"
	"gopkg.in/yaml.v3"
)

// TODO: some of these are more appropriately scoped at the workerFSM (or some other) level?
const (
	discoverySrv         = "http://localhost:8000"
	signalEndpoint       = "/v1/signal"
	consumerEndpoint     = "/v1/signal"
	stunSrv              = "stun:157.230.209.241:3478" // "stun:stun.l.google.com:19302"
	cTableSize           = 5
	pTableSize           = 5
	genesisAddr          = "genesis"
	natFailTimeout       = 5
	iceFailTimeout       = 5
	egressSrv            = "ws://localhost:8080"
	egressEndpoint       = "/ws"
	egressConnectTimeout = 5
	busBufferSz          = 2048
	uiRefreshHz          = 4
)

var (
	clientType = "desktop"
	// TODO The location of this variable sucks. It makes unit testing hard and
	// life even harder for the reader. Find another place for it.
	defaultHTTPClient *http.Client
	// Toggled through the ENABLE_DOMAIN_FRONTING env var
	domainFrontingEnabled = true
)

func init() {
	if strings.ToLower(os.Getenv("ENABLE_DOMAIN_FRONTING")) == "true" ||
		os.Getenv("ENABLE_DOMAIN_FRONTING") == "1" {
		domainFrontingEnabled = true
	} else if strings.ToLower(os.Getenv("ENABLE_DOMAIN_FRONTING")) == "false" ||
		os.Getenv("ENABLE_DOMAIN_FRONTING") == "0" {
		domainFrontingEnabled = false
	}
}

// Two client types are supported: 'desktop' and 'widget'. Informally, widget is a "free" peer and
// desktop is a "censored" peer. Clients share ~90% common internal architecture; the notable
// difference which defines client types is the flavor of workerFSMs and tableRouters selected to
// manage their worker tables. The notion of client type is decoupled from build target -- that is,
// both widget and desktop can be compiled to native binary AND wasm.

var ui = UIImpl{}
var bus = newIpcObserver(busBufferSz, upstreamUIHandler(ui), downstreamUIHandler(ui))
var cTable *workerTable
var cRouter tableRouter
var pTable *workerTable
var pRouter tableRouter
var wgReady sync.WaitGroup

func main() {
	switch clientType {
	case "desktop":
		// Desktop peers don't share connectivity for the MVP, so the consumer table only gets one
		// workerFSM for the local user stream associated with their HTTP proxy
		cTable = newWorkerTable([]workerFSM{*newProducerUserStream("127.0.0.1:1080")})
		cRouter = newConsumerRouter(bus.downstream, cTable)

		// Desktop peers consume connectivity over WebRTC
		var pfsms []workerFSM
		for i := 0; i < pTableSize; i++ {
			pfsms = append(pfsms, *newConsumerWebRTC())
		}
		pTable = newWorkerTable(pfsms)
		pRouter = newProducerSerialRouter(bus.upstream, pTable, cTable.size)
	case "widget":
		// Widget peers share connectivity over WebRTC
		var cfsms []workerFSM
		for i := 0; i < cTableSize; i++ {
			cfsms = append(cfsms, *newProducerWebRTC())
		}
		cTable = newWorkerTable(cfsms)
		cRouter = newConsumerRouter(bus.downstream, cTable)

		// Widget peers consume connectivity from an egress server over WebSocket
		var pfsms []workerFSM
		for i := 0; i < pTableSize; i++ {
			pfsms = append(pfsms, *newEgressConsumerWebSocket())
		}
		pTable = newWorkerTable(pfsms)
		pRouter = newProducerPoolRouter(bus.upstream, pTable)
	default:
		fmt.Printf("Invalid clientType '%v'\n", clientType)
		os.Exit(1)
	}

	var err error
	defaultHTTPClient, err = initDefaultHTTPClient()
	if err != nil {
		fmt.Printf("Failed to initialize default http client: %v", err)
		os.Exit(1)
	}
	bus.start()
	cRouter.init()
	pRouter.init()
	ui.OnReady()
	ui.OnStartup()
	select {}
}

func start() {
	wgReady.Add(cTable.size + pTable.size)
	cTable.start()
	pTable.start()
}

func stop() {
	cTable.stop()
	pTable.stop()

	go func() {
		wgReady.Wait()
		ui.OnReady()
	}()
}

func debug() {
	fmt.Printf("NumGoroutine: %v\n", runtime.NumGoroutine())
}

// initDefaultHTTPClient initializes domain fronting (if enabled) and
// returns an HTTP client that uses domain fronting and the default HTTP client
// otherwise.
func initDefaultHTTPClient() (*http.Client, error) {
	if !domainFrontingEnabled {
		// If no domain fronting is enabled, just return a default HTTP client
		return &http.Client{}, nil
	}

	// Fetch global config
	// XXX 2022-11-16 <soltzen>: This is a **very** temporary function since
	// this codebase will be merged with Flashlight at one point and Flashlight
	// would already have access to the global config and would have
	// domain-fronting already configured, so this function will be replaced
	// very, very fast.
	resp, err := http.Get("https://globalconfig.flashlightproxy.com/global.yaml.gz")
	if err != nil {
		return nil, fmt.Errorf("unable to fetch global config: %v", err)
	}
	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("unable to read global config: %v", err)
	}
	gzipReader, err := gzip.NewReader(bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("unable to decompress global config: %v", err)
	}
	defer gzipReader.Close()

	// Parse global config
	var globalConfig config.Global
	if err := yaml.NewDecoder(gzipReader).Decode(&globalConfig); err != nil {
		return nil, fmt.Errorf("unable to parse global config: %v", err)
	}

	certs, err := globalConfig.TrustedCACerts()
	if err != nil {
		return nil, fmt.Errorf("failed to load trusted CAs: %v", err)
	}
	fronted.Configure(certs,
		globalConfig.Client.FrontedProviders(),
		// See explanation on this hardcoded string here
		// https://github.com/getlantern/flashlight/blob/42e96aafdb73f07eebf05a63c3778c0314a30200/config/client_config.go#L10
		"cloudfront",
		filepath.Join("masquerade_cache"))

	return &http.Client{
		Transport: proxied.Fronted(0),
	}, nil
}
