//go:build !wasm

// ui_default_impl.go implements the UI interface (see ui.go) for non-wasm build targets
package clientcore

type UIImpl struct {
	UI
	Broflake *Broflake
}

func (ui *UIImpl) Init(bf *Broflake) {
	ui.Broflake = bf
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
	// TODO: do something?
}

func (ui UIImpl) OnStartup() {
	ui.Broflake.start()
}

func (ui UIImpl) OnDownstreamChunk(size int, workerIdx int) {
	// TODO: do something?
}

func (ui UIImpl) OnDownstreamThroughput(bytesPerSec int) {
	// TODO: do something?
}

func (ui UIImpl) OnConsumerConnectionChange(state int, workerIdx int, loc string) {
	// TODO: do something?
}
