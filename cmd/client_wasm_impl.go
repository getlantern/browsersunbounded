//go:build wasm

// client_wasm_impl.go is the entry point for standalone builds for wasm build targets
package main

import (
	"log"
	"syscall/js"

	"github.com/anacrolix/envpprof"
	"github.com/getlantern/broflake/clientcore"
)

func main() {
	defer envpprof.Stop()
	log.Printf("wasm client started...")

	// exposed to JS: newBroflake(clientType, cTableSize, pTableSize, busBufferSz, netstated, tag)
	// returns a reference to a Broflake JS API impl (defined in ui_wasm_impl.go)
	js.Global().Set(
		"newBroflake",
		js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			bfOpt := clientcore.BroflakeOptions{
				ClientType:  args[0].String(),
				CTableSize:  args[1].Int(),
				PTableSize:  args[2].Int(),
				BusBufferSz: args[3].Int(),
				Netstated:   args[4].String(),
			}

			rtcOpt := clientcore.NewDefaultWebRTCOptions()
			rtcOpt.Tag = args[5].String()

			egOpt := clientcore.NewDefaultEgressOptions()

			_, ui, err := clientcore.NewBroflake(&bfOpt, rtcOpt, egOpt)
			if err != nil {
				log.Printf("newBroflake error: %v\n", err)
				return nil
			}

			log.Printf("Built new Broflake API: %v\n", ui.ID)
			return js.Global().Get(ui.ID)
		}),
	)

	select {}
}
