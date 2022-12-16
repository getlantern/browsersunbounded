// client.go is the main entry point for all the client variants
package main

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/getlantern/broflake/clientcore"
)

// TODO: some of these are more appropriately scoped at the workerFSM (or some other) level?
var (
	webrtcOptions = &clientcore.WebRTCOptions{
		DiscoverySrv:   "http://localhost:8000",
		Endpoint:       "/v1/signal",
		StunSrvs:       []string{"stun:157.230.209.241:3478"}, // "stun:stun.l.google.com:19302"
		GenesisAddr:    "genesis",
		NATFailTimeout: 5 * time.Second,
		ICEFailTimeout: 5 * time.Second,
	}

	egressOptions = &clientcore.EgressOptions{
		Addr:           "ws://localhost:8080",
		Endpoint:       "/ws",
		ConnectTimeout: 5 * time.Second,
	}

	clientType = "desktop"
)

const (
	cTableSize  = 5
	pTableSize  = 5
	busBufferSz = 16
)

var bfconn *clientcore.BroflakeConn
var ui = clientcore.UIImpl{}
var bus = clientcore.NewIpcObserver(
	busBufferSz,
	clientcore.UpstreamUIHandler(ui),
	clientcore.DownstreamUIHandler(ui),
)
var cTable *clientcore.WorkerTable
var cRouter clientcore.TableRouter
var pTable *clientcore.WorkerTable
var pRouter clientcore.TableRouter
var wgReady sync.WaitGroup

// Two client types are supported: 'desktop' and 'widget'. Informally, widget is a "free" peer and
// desktop is a "censored" peer. Clients share ~90% common internal architecture; the notable
// difference which defines client types is the flavor of workerFSMs and tableRouters selected to
// manage their worker tables. The notion of client type is decoupled from build target -- that is,
// both widget and desktop can be compiled to native binary AND wasm.

func main() {
	switch clientType {
	case "desktop":
		// Desktop peers don't share connectivity for the MVP, so the consumer table only gets one
		// workerFSM for the local user stream associated with their HTTP proxy
		var producerUserStream *clientcore.WorkerFSM
		bfconn, producerUserStream = clientcore.NewProducerUserStream(&wgReady)
		cTable = clientcore.NewWorkerTable([]clientcore.WorkerFSM{*producerUserStream})
		cRouter = clientcore.NewConsumerRouter(bus.Downstream, cTable)

		// Desktop peers consume connectivity over WebRTC
		var pfsms []clientcore.WorkerFSM
		for i := 0; i < pTableSize; i++ {
			pfsms = append(pfsms, *clientcore.NewConsumerWebRTC(webrtcOptions, &wgReady))
		}
		pTable = clientcore.NewWorkerTable(pfsms)
		pRouter = clientcore.NewProducerSerialRouter(bus.Upstream, pTable, cTable.Size())
	case "widget":
		// Widget peers share connectivity over WebRTC
		var cfsms []clientcore.WorkerFSM
		for i := 0; i < cTableSize; i++ {
			cfsms = append(cfsms, *clientcore.NewProducerWebRTC(webrtcOptions, &wgReady))
		}
		cTable = clientcore.NewWorkerTable(cfsms)
		cRouter = clientcore.NewConsumerRouter(bus.Downstream, cTable)

		// Widget peers consume connectivity from an egress server over WebSocket
		var pfsms []clientcore.WorkerFSM
		for i := 0; i < pTableSize; i++ {
			pfsms = append(pfsms, *clientcore.NewEgressConsumerWebSocket(egressOptions, &wgReady))
		}
		pTable = clientcore.NewWorkerTable(pfsms)
		pRouter = clientcore.NewProducerPoolRouter(bus.Upstream, pTable)
	default:
		fmt.Printf("Invalid clientType '%v'\n", clientType)
		os.Exit(1)
	}

	broflake := clientcore.NewBroflake(cTable, pTable, &ui, &wgReady)
	ui.Init(broflake)
	bus.Start()
	cRouter.Init()
	pRouter.Init()
	ui.OnReady()
	ui.OnStartup()

	if clientType == "desktop" {
		runLocalProxy()
	}

	select {}
}
