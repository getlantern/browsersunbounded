// protocol.go provides primitives for defining client protocol behavior
package clientcore

import (
	"context"
	"fmt"
	"sync"
)

const (
	workerBufferSz = 16
)

// WorkerFSM implements a Mealy machine: https://en.wikipedia.org/wiki/Mealy_machine
// A WorkerFSM independently manages the lifetime of a single connection slot. A client maintains
// two pools of WorkerFSMs - one for upstream channels and one for downstream channels.
type WorkerFSM struct {
	com          *ipcChan
	currentState int
	nextInput    []interface{}
	state        []FSMstate
	ctx          context.Context
	cancel       context.CancelFunc
	wg           *sync.WaitGroup
}

// Construct a new WorkerFSM
func NewWorkerFSM(wg *sync.WaitGroup, states []FSMstate) *WorkerFSM {
	fsm := WorkerFSM{
		com:   newIpcChan(workerBufferSz),
		state: states,
		wg:    wg,
	}

	return &fsm
}

// Start this WorkerFSM
func (fsm *WorkerFSM) Start() {
	if fsm.wg != nil {
		fsm.wg.Add(1)
	}
	go func() {
		defer func() {
			if fsm.wg != nil {
				fsm.wg.Done()
			}
		}()
		fmt.Println("Starting WorkerFSM...")
		fsm.ctx, fsm.cancel = context.WithCancel(context.Background())

		for {
			select {
			case <-fsm.ctx.Done():
				fmt.Println("Stopping WorkerFSM...")
				return
			default:
				fsm.currentState, fsm.nextInput = fsm.state[fsm.currentState](fsm.ctx, fsm.com, fsm.nextInput)
			}
		}
	}()
}

// Stop this WorkerFSM (takes effect upon returning from the currently executing state)
func (fsm *WorkerFSM) Stop() {
	fsm.cancel()
}

// FSMstate encapsulates logic for one state in a WorkerFSM. An FSMstate must return an int
// corresponding to the next state and a list of any inputs to propagate to the next state.
// TODO: a state's number simply corresponds to its index in WorkerFSM.state, but we perform no
// sanity checking of state indices.
type FSMstate func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{})
