// egress_consumer.go implements egress consumer behavior over WebSockets, including connection
// establishment, connection error detection, and reset. See:
// https://docs.google.com/spreadsheets/d/1qM1gwPRtTKTFfZZ0e51R7AdS6qkPlKMuJX3D3vmpG_U/edit#gid=654426763

package main

import (
	"context"
	"fmt"
	"time"

	"github.com/getlantern/broflake/common"
	"nhooyr.io/websocket"
)

func newEgressConsumerWebSocket() *workerFSM {
	return newWorkerFSM([]FSMstate{
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 0
			// (no input data)
			fmt.Printf("Egress consumer state 0, opening WebSocket connection...\n")

			// We're resetting this slot, so send a nil path assertion IPC message
			select {
			case com.tx <- ipcMsg{ipcType: PathAssertionIPC, data: common.PathAssertion{}}:
				// Do nothing, message sent
			default:
				panic("Egress consumer buffer overflow!")
			}

			// TODO: interesting quirk here: if the table router which manages this workerFSM implements
			// non-multiplexed just-in-time strategy wherein it creates a new websocket connection for
			// each new censored peer, we've got a chicken and egg deadlock: the consumer table won't
			// start advertising connectivity until it detects a non-nil path assertion, and we won't
			// have a non-nil path assertion until a censored peer connects to us. 3 poss solutions: make
			// this egress consumer workerFSM always emit a (*, 1) path assertion, even when it doesn't
			// have upstream connectivity... OR invent another special case for the host field which
			// indicates "on request", as an escape hatch which indicates to a consumer table that it
			// can use that slot to dial a lantern-controlled exit node, so we'd be emitting something
			// like ($, 1)... OR just disallow just-in-time strategies, and make egress consumers
			// pre-establish N websocket connections

			ctx, cancel := context.WithTimeout(context.Background(), egressConnectTimeout*time.Second)
			defer cancel()

			// TODO: WSS

			c, _, err := websocket.Dial(ctx, egressSrv+egressEndpoint, nil)
			if err != nil {
				fmt.Printf("Couldn't connect to egress server at %v\n", egressSrv)
				return 0, []interface{}{}
			}

			return 1, []interface{}{c}
		}),
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 1
			// input[0]: *websocket.Conn
			c := input[0].(*websocket.Conn)
			fmt.Printf("Egress consumer state 1, WebSocket connection established!\n")

			// Send a path assertion IPC message representing the connectivity now provided by this slot
			// TODO: post-MVP we shouldn't be hardcoding (*, 1) here...
			allowAll := []common.Endpoint{{Host: "*", Distance: 1}}
			select {
			case com.tx <- ipcMsg{ipcType: PathAssertionIPC, data: common.PathAssertion{Allow: allowAll}}:
				// Do nothing, message sent
			default:
				panic("Egress consumer buffer overflow!")
			}

			// Seems to be 3 strategies for detecting connection failure: catch the error on calls
			// to Read and Write, try pinging the peer every so often, or somehow detect when the
			// underlying TCP connection gets borked. It seems like detecting error on Read works well?

			// WebSocket read loop:
			readStatus := make(chan error)
			go func() {
				for {
					_, b, err := c.Read(context.Background())
					if err != nil {
						readStatus <- err
						return
					}

					// Wrap the chunk and send it on to the router
					select {
					case com.tx <- ipcMsg{ipcType: ChunkIPC, data: b}:
						// Do nothing, message sent
					default:
						panic("Egress consumer buffer overflow!")
					}
				}
			}()

			// Main loop:
			// 1. handle chunks from the bus, write them to the WebSocket, detect and handle write errors
			// 2. listen for errors from the read process and handle them
			for {
				select {
				case msg := <-com.rx:
					// write the chunk to the websocket, detect and handle error
					// TODO: is it safe to assume the message is a chunk type? Do we trust the router?
					err := c.Write(context.Background(), websocket.MessageBinary, msg.data.([]byte))
					if err != nil {
						c.Close(websocket.StatusAbnormalClosure, err.Error())
						fmt.Printf("Egress consumer WebSocket write error: %v\n", err)
						return 0, []interface{}{}
					}
				case err := <-readStatus:
					c.Close(websocket.StatusAbnormalClosure, err.Error())
					fmt.Printf("Egress consumer WebSocket read error: %v\n", err)
					return 0, []interface{}{}
				}
			}

			// TODO: We shouldn't reach this code path, right?
			return 0, []interface{}{}
		}),
	})
}
