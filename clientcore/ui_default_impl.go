//go:build !wasm

// ui_default_impl.go implements the UI interface (see ui.go) for non-wasm build targets
package clientcore

import (
	"net"
)

type UIImpl struct {
	UI
	BUEngine *BUEngine
}

func (ui *UIImpl) Init(bu *BUEngine) {
	ui.BUEngine = bu
}

func (ui UIImpl) Start() {
	ui.BUEngine.start()
}

func (ui UIImpl) Stop() {
	ui.BUEngine.stop()
}

func (ui UIImpl) Debug() {
	ui.BUEngine.debug()
}

func (ui UIImpl) OnReady() {
	// TODO: do something?
}

func (ui UIImpl) OnStartup() {
	ui.BUEngine.start()
}

func (ui UIImpl) OnDownstreamChunk(size int, workerIdx int) {
	// TODO: do something?
}

func (ui UIImpl) OnDownstreamThroughput(bytesPerSec int) {
	// TODO: do something?
}

func (ui UIImpl) OnConsumerConnectionChange(state int, workerIdx int, addr net.IP) {
	// TODO: do something?
}
