// ipc.go defines structures and functionality for communication between client system components
package clientcore

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
type workerID int

type IpcMsg struct {
	IpcType msgType
	Data    interface{}
	Wid     workerID
}

type ipcChan struct {
	tx chan IpcMsg
	rx chan IpcMsg
}

func newIpcChan(bufferSz int) *ipcChan {
	return &ipcChan{tx: make(chan IpcMsg, bufferSz), rx: make(chan IpcMsg, bufferSz)}
}

type ipcObserver struct {
	Downstream *ipcChan
	Upstream   *ipcChan
	onTx       func(IpcMsg)
	onRx       func(IpcMsg)
}

func (o *ipcObserver) Start() {
	go func() {
		for {
			msg := <-o.Downstream.tx
			o.onTx(msg)
			select {
			case o.Upstream.tx <- msg:
				// Do nothing, message sent
			default:
				panic("Observer buffer overflow!")
			}
		}
	}()

	go func() {
		for {
			msg := <-o.Upstream.rx
			o.onRx(msg)
			select {
			case o.Downstream.rx <- msg:
				// Do nothing, message sent
			default:
				panic("Observer buffer overflow!")
			}
		}
	}()
}

func NewIpcObserver(bufferSz int, onTx, onRx func(IpcMsg)) *ipcObserver {
	if onTx == nil {
		onTx = func(IpcMsg) {}
	}

	if onRx == nil {
		onRx = func(IpcMsg) {}
	}

	return &ipcObserver{
		Downstream: newIpcChan(bufferSz),
		Upstream:   newIpcChan(bufferSz),
		onTx:       onTx,
		onRx:       onRx,
	}
}
