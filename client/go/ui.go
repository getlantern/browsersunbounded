// ui.go defines a standard interface for UI status bindings across build platforms
package main

import (
	"sync/atomic"
	"time"

	"github.com/getlantern/broflake/common"
)

type UI interface {
	OnDownstreamChunk(size int, workerIdx int)

	OnDownstreamThroughput(bytesPerSec int)

	OnConsumerConnectionChange(state int, workerIdx int, loc string)

	Start()

	Stop()

	Debug()
}

func downstreamUIHandler(ui UIImpl) func(msg ipcMsg) {
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

	return func(msg ipcMsg) {
		switch msg.ipcType {
		case ChunkIPC:
			size := len(msg.data.([]byte))
			atomic.AddInt64(&bytesPerSec, int64(size))
			ui.OnDownstreamChunk(size, int(msg.wid))
		}
	}
}

func upstreamUIHandler(ui UIImpl) func(msg ipcMsg) {
	return func(msg ipcMsg) {
		switch msg.ipcType {
		case ConsumerInfoIPC:
			ci := msg.data.(common.ConsumerInfo)
			state := 1
			if ci.Nil() {
				state = -1
			}
			ui.OnConsumerConnectionChange(state, int(msg.wid), ci.Location)
		}
	}
}
