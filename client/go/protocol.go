// protocol.go provides primitives for defining client protocol behavior
package main

const (
	workerBufferSz = 2048
)

// workerFSM implements a Mealy machine: https://en.wikipedia.org/wiki/Mealy_machine
// A workerFSM independently manages the lifetime of a single connection slot. A client maintains
// two pools of workerFSMs - one for upstream channels and one for downstream channels.
type workerFSM struct {
	com          *ipcChan
	nStates      int
	currentState int
	nextInput    []interface{}
	state        []FSMstate
}

// Construct a new workerFSM
func newWorkerFSM(states []FSMstate) *workerFSM {
	fsm := workerFSM{
		com:     newIpcChan(workerBufferSz),
		nStates: len(states),
		state:   states,
	}
	return &fsm
}

// Start this workerFSM
func (fsm *workerFSM) start() {
	for {
		fsm.currentState, fsm.nextInput = fsm.state[fsm.currentState](fsm.com, fsm.nextInput)
	}
}

// FSMstate encapsulates logic for one state in a workerFSM. An FSMstate must return an int
// corresponding to the next state and a list of any inputs to propagate to the next state.
// TODO: a state's number simply corresponds to its index in workerFSM.state, but we perform no
// sanity checking of state indices.
type FSMstate func(com *ipcChan, input []interface{}) (int, []interface{})
