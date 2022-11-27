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

type IPCMsg struct {
	IpcType msgType
	Data    interface{}
	Wid     workerID
}

type ipcChan struct {
	tx chan IPCMsg
	rx chan IPCMsg
}

func newIpcChan(bufferSz int) *ipcChan {
	return &ipcChan{tx: make(chan IPCMsg, bufferSz), rx: make(chan IPCMsg, bufferSz)}
}

type ipcObserver struct {
	Downstream *ipcChan
	Upstream   *ipcChan
	onTx       func(IPCMsg)
	onRx       func(IPCMsg)
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

func NewIpcObserver(bufferSz int, onTx, onRx func(IPCMsg)) *ipcObserver {
	if onTx == nil {
		onTx = func(IPCMsg) {}
	}

	if onRx == nil {
		onRx = func(IPCMsg) {}
	}

	return &ipcObserver{
		Downstream: newIpcChan(bufferSz),
		Upstream:   newIpcChan(bufferSz),
		onTx:       onTx,
		onRx:       onRx,
	}
}
