//go:build !wasm
// +build !wasm

// ui_default_impl.go implements the UI interface (see ui.go) for non-wasm build targets
package main

type UIImpl struct {
	UI
}

func (ui *UIImpl) OnDownstreamChunk(size int, workerIdx int) {
	// TODO: do something?
}

func (ui *UIImpl) OnDownstreamThroughput(bytesPerSec int) {
	// TODO: do something?
}

func (ui *UIImpl) OnConsumerConnectionChange(newState int, workerIdx int, loc string) {
	// TODO: do something?
}
