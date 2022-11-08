// consumer.go implements standard consumer behavior over WebRTC, including the discovery process,
// signaling, connection establishment, connection error detection, and reset. See:
// https://docs.google.com/spreadsheets/d/1qM1gwPRtTKTFfZZ0e51R7AdS6qkPlKMuJX3D3vmpG_U/edit#gid=0

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/getlantern/broflake/common"
	"github.com/pion/webrtc/v3"
)

func newConsumerWebRTC() *workerFSM {
	return newWorkerFSM([]FSMstate{
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 0
			// (no input data)
			fmt.Printf("Consumer state 0, constructing RTCPeerConnection...\n")

			// We're resetting this slot, so send a nil path assertion IPC message
			select {
			case com.tx <- ipcMsg{ipcType: PathAssertionIPC, data: common.PathAssertion{}}:
				// Do nothing, message sent
			default:
				panic("Consumer buffer overflow!")
			}

			// TODO: STUN servers will eventually be provided in a more sophisticated way
			config := webrtc.Configuration{
				ICEServers: []webrtc.ICEServer{
					{
						URLs: []string{stunSrv},
					},
				},
			}

			// Construct the RTCPeerConnection
			peerConnection, err := webrtc.NewPeerConnection(config)
			if err != nil {
				panic(err)
			}

			// Consumers are the offerers, so we must create a datachannel
			d, err := peerConnection.CreateDataChannel("data", nil)
			if err != nil {
				panic(err)
			}

			// We want to make sure we capture the connection establishment event whenever it happens,
			// but we also want to avoid control flow spaghetti (it would very hard to reason about
			// client operation if we sometimes jump forward to future states based on async events
			// firing outside of the state machine). Solution: Pass forward this buffered channel such
			// that we can explicitly check for connection establishment in state 4. In theory, it's
			// possible that magical ICE mysteries could cause the connection to open as early as the end
			// of state 2. In practice, the differences here should be on the order of nanoseconds. But
			// we should monitor the logs to see if connections open too long before we check for them.
			connectionEstablished := make(chan *webrtc.DataChannel, 10)
			d.OnOpen(func() {
				fmt.Printf("A datachannel has opened!\n")
				connectionEstablished <- d
			})

			// Ditto, but for connection state changes
			connectionChange := make(chan webrtc.PeerConnectionState, 10)
			peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
				fmt.Printf("Peer connection state change: %v\n", s.String())
				connectionChange <- s
			})

			return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
		}),
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 1
			// input[0]: *webrtc.PeerConnection
			// input[1]: chan *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			peerConnection := input[0].(*webrtc.PeerConnection)
			connectionEstablished := input[1].(chan *webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			fmt.Printf("Consumer state 1...\n")

			// Listen for genesis messages
			// TODO: use a custom http.Client and control our TCP connections
			res, err := http.Get(discoverySrv + consumerEndpoint)
			if err != nil {
				fmt.Printf("Couldn't subscribe to genesis stream at %v\n", discoverySrv+consumerEndpoint)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
			}
			defer res.Body.Close()

			reader := bufio.NewReader(res.Body)
			for {
				rawMsg, err := reader.ReadBytes('\n')
				if err != nil {
					// TODO: what does this error mean? Should we be returning to state 1?
					return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
				}

				replyTo, _ := common.DecodeSignalMsg(rawMsg)
				// TODO: We ought to be getting an error back to indicate a malformed message
				// also TODO: post-MVP, evaluate the genesis message for suitability!

				// We like the genesis message, let's create an offer to signal back in the next step!
				offer, err := peerConnection.CreateOffer(nil)
				if err != nil {
					panic(err)
				}

				return 2, []interface{}{peerConnection, replyTo, offer, connectionEstablished, connectionChange}
			}

			// We listened as long as we could, but we never heard a suitable genesis message
			return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
		}),
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 2
			// input[0]: *webrtc.PeerConnection
			// input[1]: string (reply-to UUID)
			// input[2]: webrtc.SessionDescription (offer)
			// input[3]: chan *webrtc.DataChannel
			// input[4]: chan webrtc.PeerConnectionState
			peerConnection := input[0].(*webrtc.PeerConnection)
			replyTo := input[1].(string)
			offer := input[2].(webrtc.SessionDescription)
			connectionEstablished := input[3].(chan *webrtc.DataChannel)
			connectionChange := input[4].(chan webrtc.PeerConnectionState)
			fmt.Printf("Consumer state 2...\n")

			offerJSON, err := json.Marshal(offer)
			if err != nil {
				panic(err)
			}

			// Signal the offer
			// TODO: use a custom http.Client and control our TCP connections
			res, err := http.PostForm(
				discoverySrv+consumerEndpoint,
				url.Values{"data": {string(offerJSON)}, "send-to": {replyTo}, "type": {strconv.Itoa(int(common.SignalMsgOffer))}},
			)
			if err != nil {
				fmt.Printf("Couldn't signal offer SDP to %v\n", discoverySrv+consumerEndpoint)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
			}
			defer res.Body.Close()

			// We didn't win the connection
			if res.StatusCode == 404 {
				fmt.Printf("Too late for genesis message %v!\n", replyTo)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
			}

			// The HTTP request is complete
			answerBytes, err := ioutil.ReadAll(res.Body)
			if err != nil {
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
			}

			// TODO: Freddie sends back a 0-length body when nobody replied to our message. Is that the
			// smartest way to handle this case systemwide?
			if len(answerBytes) == 0 {
				fmt.Printf("No response for our offer SDP!\n")
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
			}

			// Looks like we got some kind of response. Should be an answer SDP in a SignalMsg
			// TODO: we ought to be getting an error back from DecodeSignalMsg if it's malformed
			replyTo, answer := common.DecodeSignalMsg(answerBytes)

			// TODO: here we assume valid answer SDP, but we need to handle the invalid case too

			// Create a channel that's blocked until ICE gathering is complete
			gatherComplete := webrtc.GatheringCompletePromise(peerConnection)

			candidates := []webrtc.ICECandidate{}
			peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
				// Interestingly, the null candidate is a nil pointer so we cause a nil ptr dereference
				// if we try to append it to the list... so let's just not include it?
				if c != nil {
					candidates = append(candidates, *c)
				}
			})

			// This kicks off ICE candidate gathering
			err = peerConnection.SetLocalDescription(offer)
			if err != nil {
				panic(err)
			}

			// Assign the answer to our connection
			err = peerConnection.SetRemoteDescription(answer.(webrtc.SessionDescription))
			if err != nil {
				// TODO: Definitely shouldn't panic here, it just indicates the offer is malformed
				panic(err)
			}

			select {
			case <-gatherComplete:
				fmt.Println("Ice gathering complete!")
			case <-time.After(iceFailTimeout * time.Second):
				fmt.Printf("Failed to gather ICE candidates!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			return 3, []interface{}{peerConnection, replyTo, candidates, connectionEstablished, connectionChange}
		}),
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 3
			// input[0]: *webrtc.PeerConnection
			// input[1]: string (replyTo)
			// input[2]: []webrtc.ICECandidates
			// input[3]: chan *webrtc.DataChannel
			// input[4]: chan webrtc.PeerConnectionState
			peerConnection := input[0].(*webrtc.PeerConnection)
			replyTo := input[1].(string)
			candidates := input[2].([]webrtc.ICECandidate)
			connectionEstablished := input[3].(chan *webrtc.DataChannel)
			connectionChange := input[4].(chan webrtc.PeerConnectionState)
			fmt.Printf("Consumer state 3...\n")

			candidatesJSON, err := json.Marshal(candidates)
			if err != nil {
				panic(err)
			}

			// Signal our ICE candidates
			// TODO: use a custom http.Client and control our TCP connections
			res, err := http.PostForm(
				discoverySrv+consumerEndpoint,
				url.Values{"data": {string(candidatesJSON)}, "send-to": {replyTo}, "type": {strconv.Itoa(int(common.SignalMsgICE))}},
			)
			if err != nil {
				fmt.Printf("Couldn't signal ICE candidates to %v\n", discoverySrv+consumerEndpoint)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}
			defer res.Body.Close()

			switch res.StatusCode {
			case 404:
				fmt.Printf("Signaling partner hung up, aborting!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			case 200:
				// Signaling is complete, so we can short circuit instead of awaiting the response body
				return 4, []interface{}{peerConnection, connectionEstablished, connectionChange}
			}

			// This code path should never be reachable
			// Borked!
			peerConnection.Close() // TODO: there's an err we should handle here
			return 0, []interface{}{}
		}),
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 4
			// input[0]: *webrtc.PeerConnection
			// input[1]: chan *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			peerConnection := input[0].(*webrtc.PeerConnection)
			connectionEstablished := input[1].(chan *webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			fmt.Printf("Consumer state 4, signaling complete!\n")

			select {
			case d := <-connectionEstablished:
				fmt.Printf("A WebRTC connection has been established!\n")
				return 5, []interface{}{peerConnection, d, connectionChange}
			case <-time.After(natFailTimeout * time.Second):
				fmt.Printf("NAT failure, aborting!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}
		}),
		FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 5
			// input[0]: *webrtc.PeerConnection
			// input[1]: *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			peerConnection := input[0].(*webrtc.PeerConnection)
			d := input[1].(*webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)

			// Send a path assertion IPC message representing the connectivity now provided by this slot
			// TODO: post-MVP we shouldn't be hardcoding (*, 1) here...
			allowAll := []common.Endpoint{{Host: "*", Distance: 1}}

			select {
			case com.tx <- ipcMsg{ipcType: PathAssertionIPC, data: common.PathAssertion{Allow: allowAll}}:
				// Do nothing, message sent
			default:
				panic("Consumer buffer overflow!")
			}

			// Inbound from datachannel:
			d.OnMessage(func(msg webrtc.DataChannelMessage) {
				select {
				case com.tx <- ipcMsg{ipcType: ChunkIPC, data: msg.Data}:
					// Do nothing, message sent
				default:
					panic("Consumer buffer overflow!")
				}
			})

			for {
				select {
				// Detect connection failure
				case s := <-connectionChange:
					if s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateDisconnected {
						fmt.Printf("Connection failure, resetting!\n")
						peerConnection.Close() // TODO: there's an err we should handle here
						return 0, []interface{}{}
					}
				// Handle messages from the router:
				case msg := <-com.rx:
					switch msg.ipcType {
					case ChunkIPC:
						if err := d.Send(msg.data.([]byte)); err != nil {
							fmt.Printf("Error sending to datachannel, resetting!\n")
							peerConnection.Close() // TODO: there's an err we should handle here
							return 0, []interface{}{}
						}
					}
				}
			}

			// This code path should be unreachable
			return 0, []interface{}{}
		}),
	})
}
