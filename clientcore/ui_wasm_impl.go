//go:build wasm

// ui_wasm_impl.go implements the UI interface (see ui.go) for wasm build targets
package clientcore

import (
	"syscall/js"
)

type UIImpl struct {
	UI
	Broflake *Broflake
}

func (ui *UIImpl) Init(bf *Broflake) {
	ui.Broflake = bf

	js.Global().Get("wasmClient").Set(
		"start",
		js.FuncOf(func(this js.Value, args []js.Value) interface{} { ui.Start(); return nil }),
	)

	js.Global().Get("wasmClient").Set(
		"stop",
		js.FuncOf(func(this js.Value, args []js.Value) interface{} { ui.Stop(); return nil }),
	)

	js.Global().Get("wasmClient").Set(
		"debug",
		js.FuncOf(func(this js.Value, args []js.Value) interface{} { ui.Debug(); return nil }),
	)
}

func (ui UIImpl) Start() {
	ui.Broflake.start()
}

func (ui UIImpl) Stop() {
	ui.Broflake.stop()
}

func (ui UIImpl) Debug() {
	ui.Broflake.debug()
}

func (ui UIImpl) OnReady() {
	js.Global().Get("wasmClient").Call("_onReady")
}

func (ui UIImpl) OnStartup() {
	// Do nothing
}

func (ui UIImpl) OnDownstreamChunk(size int, workerIdx int) {
	js.Global().Get("wasmClient").Call("_onDownstreamChunk", size, workerIdx)
}

func (ui UIImpl) OnDownstreamThroughput(bytesPerSec int) {
	js.Global().Get("wasmClient").Call("_onDownstreamThroughput", bytesPerSec)
}

func (ui UIImpl) OnConsumerConnectionChange(state int, workerIdx int, loc string) {
	js.Global().Get("wasmClient").Call("_onConsumerConnectionChange", state, workerIdx, loc)
}
