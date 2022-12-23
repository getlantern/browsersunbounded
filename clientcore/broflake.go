// broflake.go defines the abstraction for a Broflake instance
package clientcore

import (
	"log"
	"runtime"
	"sync"
)

type Broflake struct {
	cTable *WorkerTable
	pTable *WorkerTable
	ui     UI
	wg     *sync.WaitGroup
}

func NewBroflake(cTable, pTable *WorkerTable, ui UI, wg *sync.WaitGroup) *Broflake {
	return &Broflake{cTable, pTable, ui, wg}
}

func (b *Broflake) start() {
	b.cTable.Start()
	b.pTable.Start()
}

func (b *Broflake) stop() {
	b.cTable.Stop()
	b.pTable.Stop()

	go func() {
		b.wg.Wait()
		b.ui.OnReady()
	}()
}

func (b *Broflake) debug() {
	log.Printf("NumGoroutine: %v\n", runtime.NumGoroutine())
}
