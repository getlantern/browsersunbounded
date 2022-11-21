// ui.go defines a standard interface for UI status bindings across build platforms
package main

import (
	"sync/atomic"
	"time"

	"github.com/getlantern/broflake/clientcore"
	"github.com/getlantern/broflake/common"
)

type UI interface {
	Start()

	Stop()

	Debug()

	OnReady()

	OnStartup()

	OnDownstreamChunk(size int, workerIdx int)

	OnDownstreamThroughput(bytesPerSec int)

	OnConsumerConnectionChange(state int, workerIdx int, loc string)
}

func downstreamUIHandler(ui UIImpl) func(msg clientcore.IpcMsg) {
	var bytesPerSec int64
	var tick uint
	tickMs := time.Duration(1000 / uiRefreshHz)

	go func() {
		for {
			<-time.After(tickMs * time.Millisecond)
			ui.OnDownstreamThroughput(int(atomic.LoadInt64(&bytesPerSec)))
			if tick%uiRefreshHz == 0 {
				atomic.SwapInt64(&bytesPerSec, 0)
			}
			tick++
		}
	}()

	return func(msg clientcore.IpcMsg) {
		switch msg.IpcType {
		case clientcore.ChunkIPC:
			size := len(msg.Data.([]byte))
			atomic.AddInt64(&bytesPerSec, int64(size))
			ui.OnDownstreamChunk(size, int(msg.Wid))
		}
	}
}

func upstreamUIHandler(ui UIImpl) func(msg clientcore.IpcMsg) {
	return func(msg clientcore.IpcMsg) {
		switch msg.IpcType {
		case clientcore.ConsumerInfoIPC:
			ci := msg.Data.(common.ConsumerInfo)
			state := 1
			if ci.Nil() {
				state = -1
			}
			ui.OnConsumerConnectionChange(state, int(msg.Wid), ci.Location)
		}
	}
}
