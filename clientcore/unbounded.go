// unbounded.go defines mid-layer abstractions for constructing and describing a BU instance
package clientcore

import (
	"fmt"
	"runtime"
	"sync"

	"github.com/getlantern/unbounded/common"
)

type BUEngine struct {
	cTable *WorkerTable
	pTable *WorkerTable
	ui     UI
	wg     *sync.WaitGroup
}

func NewBUEngine(cTable, pTable *WorkerTable, ui UI, wg *sync.WaitGroup) *BUEngine {
	return &BUEngine{cTable, pTable, ui, wg}
}

func (b *BUEngine) start() {
	b.cTable.Start()
	b.pTable.Start()
	common.Debug("▶ BU started!")
}

func (b *BUEngine) stop() {
	b.cTable.Stop()
	b.pTable.Stop()

	go func() {
		b.wg.Wait()
		common.Debug("■ BU stopped.")
		b.ui.OnReady()
	}()
}

func (b *BUEngine) debug() {
	common.Debugf("NumGoroutine: %v", runtime.NumGoroutine())
}

func NewBU(bfOpt *BUOptions, rtcOpt *WebRTCOptions, egOpt *EgressOptions) (bfconn *BUConn, ui *UIImpl, err error) {
	if bfOpt.ClientType != "desktop" && bfOpt.ClientType != "widget" {
		err = fmt.Errorf("Invalid clientType '%v\n'", bfOpt.ClientType)
		common.Debugf(err.Error())
		return bfconn, ui, err
	}

	ui = &UIImpl{}
	var cTable *WorkerTable
	var cRouter TableRouter
	var pTable *WorkerTable
	var pRouter TableRouter
	var wgReady sync.WaitGroup

	if bfOpt == nil {
		bfOpt = NewDefaultBUOptions()
	}

	if rtcOpt == nil {
		rtcOpt = NewDefaultWebRTCOptions()
	}

	if egOpt == nil {
		egOpt = NewDefaultEgressOptions()
	}

	// The boot DAG:
	// build cTable/pTable -> build the BU struct -> run ui.Init -> set up the bus and bind
	// the upstream/downstream handlers -> build cRouter/pRouter -> start the bus, init the routers,
	// call onStartup and onReady. This dependency graph currently requires us to implement two
	// switches on clientType during the boot process, which can probably be improved upon.

	// Step 1: Build consumer table and producer table
	switch bfOpt.ClientType {
	case "desktop":
		// Desktop peers don't share connectivity for the MVP, so the consumer table only gets one
		// workerFSM for the local user stream associated with their HTTP proxy
		var producerUserStream *WorkerFSM
		bfconn, producerUserStream = NewProducerUserStream(&wgReady)
		cTable = NewWorkerTable([]WorkerFSM{*producerUserStream})

		// Desktop peers consume connectivity over WebRTC
		var pfsms []WorkerFSM
		for i := 0; i < bfOpt.PTableSize; i++ {
			pfsms = append(pfsms, *NewConsumerWebRTC(rtcOpt, &wgReady))
		}
		pTable = NewWorkerTable(pfsms)
	case "widget":
		// Widget peers share connectivity over WebRTC
		var cfsms []WorkerFSM
		for i := 0; i < bfOpt.CTableSize; i++ {
			cfsms = append(cfsms, *NewProducerWebRTC(rtcOpt, &wgReady))
		}
		cTable = NewWorkerTable(cfsms)

		// Widget peers consume connectivity from an egress server over WebSocket
		var pfsms []WorkerFSM
		for i := 0; i < bfOpt.PTableSize; i++ {
			pfsms = append(pfsms, *NewEgressConsumerWebSocket(egOpt, &wgReady))
		}
		pTable = NewWorkerTable(pfsms)
	}

	// Step 2: Build BU
	unbounded := NewBUEngine(cTable, pTable, ui, &wgReady)

	// Step 3: Init the UI (this constructs and exposes the JavaScript API as required)
	ui.Init(unbounded)

	// Step 4: Set up the bus, bind upstream and downstream UI handlers
	var bus = NewIpcObserver(
		bfOpt.BusBufferSz,
		UpstreamUIHandler(*ui, bfOpt.Netstated, rtcOpt.Tag),
		DownstreamUIHandler(*ui, bfOpt.Netstated, rtcOpt.Tag),
	)

	// Step 5: Build consumer router and producer router
	switch bfOpt.ClientType {
	case "desktop":
		cRouter = NewConsumerRouter(bus.Downstream, cTable)
		pRouter = NewProducerSerialRouter(bus.Upstream, pTable, cTable.Size())
	case "widget":
		cRouter = NewConsumerRouter(bus.Downstream, cTable)
		pRouter = NewProducerPoolRouter(bus.Upstream, pTable)
	}

	// Step 6: Start the bus, init the routers, fire our UI events to announce that we're ready
	bus.Start()
	cRouter.Init()
	pRouter.Init()
	ui.OnReady()
	ui.OnStartup()
	return bfconn, ui, nil
}
