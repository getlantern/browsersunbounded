// ui.go defines a standard interface for UI status bindings across build platforms
package clientcore

import (
	"sync/atomic"
	"time"

	"github.com/getlantern/broflake/common"
)

const (
	uiRefreshHz = 4
)

type UI interface {
	Init(bf *Broflake)

	Start()

	Stop()

	Debug()

	OnReady()

	OnStartup()

	OnDownstreamChunk(size int, workerIdx int)

	OnDownstreamThroughput(bytesPerSec int)

	OnConsumerConnectionChange(state int, workerIdx int, loc string)
}

func DownstreamUIHandler(ui UIImpl) func(msg IPCMsg) {
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

	return func(msg IPCMsg) {
		switch msg.IpcType {
		case ChunkIPC:
			size := len(msg.Data.([]byte))
			atomic.AddInt64(&bytesPerSec, int64(size))
			ui.OnDownstreamChunk(size, int(msg.Wid))
		}
	}
}

func UpstreamUIHandler(ui UIImpl) func(msg IPCMsg) {
	return func(msg IPCMsg) {
		switch msg.IpcType {
		case ConsumerInfoIPC:
			ci := msg.Data.(common.ConsumerInfo)
			state := 1
			if ci.Nil() {
				state = -1
			}
			ui.OnConsumerConnectionChange(state, int(msg.Wid), ci.Location)
		}
	}
}
