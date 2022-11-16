// client.go is the main entry point for all the client variants
package main

import (
	"fmt"
	"os"
)

// TODO: some of these are more appropriately scoped at the workerFSM (or some other) level?
const (
	discoverySrv         = "http://localhost:8000"
	signalEndpoint       = "/v1/signal"
	consumerEndpoint     = "/v1/signal"
	stunSrv              = "stun:freefood.is:3478" // "stun:stun.l.google.com:19302"
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
)

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

		// TODO nelson 11/16/22: there will eventually be some driver code which lives in or near
		// Flashlight (and also prob a UI mechanism) to start and stop the desktop client... until
		// then, we bring it to life right here:
		start()
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

	bus.start()
	cRouter.init()
	pRouter.init()
	select {}
}

func start() {
	cTable.start()
	pTable.start()
}

func stop() {
	cTable.stop()
	pTable.stop()
}
