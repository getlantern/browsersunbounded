//+build wasm

// ui_wasm_impl.go implements the UI interface (see ui.go) for wasm build targets  
package main

import (
  "syscall/js"
)

type UIImpl struct {
  UI
}

func (ui *UIImpl) OnDownstreamChunk(size int, workerIdx int) {
  js.Global().Get("wasmClient").Call("_onDownstreamChunk", size, workerIdx)
}

func (ui *UIImpl) OnDownstreamThroughput(bytesPerSec int) {
  js.Global().Get("wasmClient").Call("_onDownstreamThroughput", bytesPerSec)
}

func (ui *UIImpl) OnConsumerConnectionChange(newState int, workerIdx int, loc string) {
  js.Global().Get("wasmClient").Call("_onConsumerConnectionChange", newState, workerIdx, loc)
}
