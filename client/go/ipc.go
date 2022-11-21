// ipc.go defines structures and functionality for communication between client system components
package main

import (
	"fmt"
)

// ChunkIPC: data plane traffic
// PathAssertionIPC: how upstream processes describe their connectivity for downstream processes
// ConsumerInfoIPC: how downstream processes describe their connectivity for upstream processes
// ConnectivityCheckIPC: how processes request the connectivity situation from their counterparts

const (
	ChunkIPC msgType = iota
	PathAssertionIPC
	ConsumerInfoIPC
	ConnectivityCheckIPC
)

const (
	NoRoute        = workerID(-1)
	BroadcastRoute = workerID(-2)
)

type msgType int

func (m msgType) String() string {
	switch m {
	case ChunkIPC:
		return "ChunkIPC"
	case PathAssertionIPC:
		return "PathAssertionIPC"
	case ConsumerInfoIPC:
		return "ConsumerInfoIPC"
	case ConnectivityCheckIPC:
		return "ConnectivityCheckIPC"
	default:
		return "Unknown"
	}
}

type workerID int

type ipcMsg struct {
	ipcType msgType
	data    interface{}
	wid     workerID
}

func (m ipcMsg) String() string {
	return fmt.Sprintf("ipcMsg{ipcType: %s, data: %v, wid: %d}", m.ipcType, m.data, m.wid)
}

type ipcChan struct {
	tx chan ipcMsg
	rx chan ipcMsg
}

func newIpcChan(bufferSz int) *ipcChan {
	return &ipcChan{tx: make(chan ipcMsg, bufferSz), rx: make(chan ipcMsg, bufferSz)}
}

type ipcObserver struct {
	downstream *ipcChan
	upstream   *ipcChan
	onTx       func(ipcMsg)
	onRx       func(ipcMsg)
}

func (o *ipcObserver) start() {
	go func() {
		for {
			msg := <-o.downstream.tx
			o.onTx(msg)
			logger.Tracef(
				"ipcObserver: sending msg from downstream.tx -> upstream.tx: %+v\n",
				msg)
			select {
			case o.upstream.tx <- msg:
				// Do nothing, message sent
			default:
				panic("Observer buffer overflow!")
			}
		}
	}()

	go func() {
		for {
			msg := <-o.upstream.rx
			logger.Tracef(
				"ipcObserver: sending msg from upstream.rx -> downstream.rx: %+v\n",
				msg)
			o.onRx(msg)
			select {
			case o.downstream.rx <- msg:
				// Do nothing, message sent
			default:
				panic("Observer buffer overflow!")
			}
		}
	}()
}

func newIpcObserver(bufferSz int, onTx, onRx func(ipcMsg)) *ipcObserver {
	if onTx == nil {
		onTx = func(ipcMsg) {}
	}

	if onRx == nil {
		onRx = func(ipcMsg) {}
	}

	return &ipcObserver{
		downstream: newIpcChan(bufferSz),
		upstream:   newIpcChan(bufferSz),
		onTx:       onTx,
		onRx:       onRx,
	}
}
