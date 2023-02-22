// consumer.go implements standard consumer behavior over WebRTC, including the discovery process,
// signaling, connection establishment, connection error detection, and reset. See:
// https://docs.google.com/spreadsheets/d/1qM1gwPRtTKTFfZZ0e51R7AdS6qkPlKMuJX3D3vmpG_U/edit#gid=0

package clientcore

import (
	"bufio"
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/getlantern/broflake/common"
	"github.com/pion/webrtc/v3"
)

func NewConsumerWebRTC(options *WebRTCOptions, wg *sync.WaitGroup) *WorkerFSM {
	return NewWorkerFSM(wg, []FSMstate{
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 0
			// (no input data)
			log.Printf("Consumer state 0, constructing RTCPeerConnection...\n")

			// We're resetting this slot, so send a nil path assertion IPC message
			com.tx <- IPCMsg{IpcType: PathAssertionIPC, Data: common.PathAssertion{}}

			STUNSrvs, err := options.STUNBatch(options.STUNBatchSize)
			if err != nil {
				log.Printf("Error creating STUN batch: %v\n", err)
				return 0, []interface{}{}
			}

			log.Printf("Created STUN batch (%v/%v servers)\n", len(STUNSrvs), options.STUNBatchSize)

			config := webrtc.Configuration{
				ICEServers: []webrtc.ICEServer{
					{
						URLs: STUNSrvs,
					},
				},
			}

			// Construct the RTCPeerConnection
			peerConnection, err := webrtc.NewPeerConnection(config)
			if err != nil {
				log.Printf("Error creating RTCPeerConnection: %v\n", err)
				return 0, []interface{}{}
			}

			// Consumers are the offerers, so we must create a datachannel
			// The following configuration creates a UDP-like unreliable channel
			dataChannelConfig := webrtc.DataChannelInit{Ordered: new(bool), MaxRetransmits: new(uint16)}
			d, err := peerConnection.CreateDataChannel("data", &dataChannelConfig)
			if err != nil {
				log.Printf("Error creating WebRTC datachannel: %v\n", err)
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// We want to make sure we capture the connection establishment event whenever it happens,
			// but we also want to avoid control flow spaghetti (it would very hard to reason about
			// client operation if we sometimes jump forward to future states based on async events
			// firing outside of the state machine). Solution: Pass forward this buffered channel such
			// that we can explicitly check for connection establishment in state 4. In theory, it's
			// possible that magical ICE mysteries could cause the connection to open as early as the end
			// of state 2. In practice, the differences here should be on the order of nanoseconds. But
			// we should monitor the logs to see if connections open too long before we check for them.
			connectionEstablished := make(chan *webrtc.DataChannel, 1)

			d.OnOpen(func() {
				log.Printf("A datachannel has opened!\n")
				connectionEstablished <- d
			})

			// connectionClosed (and the OnClose handler below) is implemented for Firefox, the only
			// browser which doesn't implement WebRTC's onconnectionstatechange event. We listen for both
			// onclose and onconnectionstatechange under the assumption that non-Firefox browsers can
			// benefit from faster connection failure detection by listening for the `failed` event.
			connectionClosed := make(chan struct{}, 1)
			d.OnClose(func() {
				log.Printf("A datachannel has closed!\n")
				connectionClosed <- struct{}{}
			})

			// Ditto, but for connection state changes
			connectionChange := make(chan webrtc.PeerConnectionState, 16)
			peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
				log.Printf("Peer connection state change: %v\n", s.String())
				connectionChange <- s
			})

			return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 1
			// input[0]: *webrtc.PeerConnection
			// input[1]: chan *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			// input[3]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			connectionEstablished := input[1].(chan *webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			connectionClosed := input[3].(chan struct{})
			log.Printf("Consumer state 1...\n")

			// Listen for genesis messages
			res, err := options.HttpClient.Get(options.DiscoverySrv + options.Endpoint)
			if err != nil {
				log.Printf("Couldn't subscribe to genesis stream at %v\n", options.DiscoverySrv+options.Endpoint)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}
			defer res.Body.Close()

			reader := bufio.NewReader(res.Body)
			for {
				rawMsg, err := reader.ReadBytes('\n')
				if err != nil {
					// TODO: what does this error mean? Should we be returning to state 1?
					return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
				}

				replyTo, _, err := common.DecodeSignalMsg(rawMsg)
				if err != nil {
					log.Printf("Error decoding signal message: %v", err)
					// TODO: is it more desirable to restart the state instead of continuing the loop here?
					continue
				}
				// TODO: post-MVP, evaluate the genesis message for suitability! (Add a conditional
				// block here that continues the for loop if this genesis message is unsuitable)

				// We like the genesis message, let's create an offer to signal back in the next step!
				sdp, err := peerConnection.CreateOffer(nil)
				if err != nil {
					log.Printf("Error creating offer SDP: %v", err)
					// TODO: is it more desirable to restart the state instead of continuing the loop here?
					continue
				}

				return 2, []interface{}{peerConnection, replyTo, sdp, connectionEstablished, connectionChange, connectionClosed}
			}

			// We listened as long as we could, but we never heard a suitable genesis message
			return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 2
			// input[0]: *webrtc.PeerConnection
			// input[1]: string (reply-to UUID)
			// input[2]: webrtc.SessionDescription (offer)
			// input[3]: chan *webrtc.DataChannel
			// input[4]: chan webrtc.PeerConnectionState
			// input[5]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			replyTo := input[1].(string)
			sdp := input[2].(webrtc.SessionDescription)
			connectionEstablished := input[3].(chan *webrtc.DataChannel)
			connectionChange := input[4].(chan webrtc.PeerConnectionState)
			connectionClosed := input[5].(chan struct{})
			log.Printf("Consumer state 2...\n")

			offerJSON, err := json.Marshal(common.OfferMsg{SDP: sdp, Tag: options.Tag})
			if err != nil {
				log.Printf("Error marshaling JSON: %v\n", err)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// Signal the offer
			res, err := options.HttpClient.PostForm(
				options.DiscoverySrv+options.Endpoint,
				url.Values{"data": {string(offerJSON)}, "send-to": {replyTo}, "type": {strconv.Itoa(int(common.SignalMsgOffer))}},
			)
			if err != nil {
				log.Printf("Couldn't signal offer SDP to %v\n", options.DiscoverySrv+options.Endpoint)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}
			defer res.Body.Close()

			// We didn't win the connection
			if res.StatusCode == 404 {
				log.Printf("Too late for genesis message %v!\n", replyTo)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// The HTTP request is complete
			answerBytes, err := ioutil.ReadAll(res.Body)
			if err != nil {
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// TODO: Freddie sends back a 0-length body when nobody replied to our message. Is that the
			// smartest way to handle this case systemwide?
			if len(answerBytes) == 0 {
				log.Printf("No response for our offer SDP!\n")
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// Looks like we got some kind of response. Should be an answer SDP in a SignalMsg
			replyTo, answer, err := common.DecodeSignalMsg(answerBytes)
			if err != nil {
				log.Printf("Error decoding signal message: %v\n", err)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

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
			err = peerConnection.SetLocalDescription(sdp)
			if err != nil {
				log.Printf("Error setting local description: %v\n", err)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// Assign the answer to our connection
			err = peerConnection.SetRemoteDescription(answer.(webrtc.SessionDescription))
			if err != nil {
				log.Printf("Error setting remote description: %v\n", err)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			select {
			case <-gatherComplete:
				log.Println("Ice gathering complete!")
			case <-time.After(options.ICEFailTimeout):
				log.Printf("Failed to gather ICE candidates!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			return 3, []interface{}{peerConnection, replyTo, candidates, connectionEstablished, connectionChange, connectionClosed}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 3
			// input[0]: *webrtc.PeerConnection
			// input[1]: string (replyTo)
			// input[2]: []webrtc.ICECandidates
			// input[3]: chan *webrtc.DataChannel
			// input[4]: chan webrtc.PeerConnectionState
			// input[5]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			replyTo := input[1].(string)
			candidates := input[2].([]webrtc.ICECandidate)
			connectionEstablished := input[3].(chan *webrtc.DataChannel)
			connectionChange := input[4].(chan webrtc.PeerConnectionState)
			connectionClosed := input[5].(chan struct{})
			log.Printf("Consumer state 3...\n")

			candidatesJSON, err := json.Marshal(candidates)
			if err != nil {
				log.Printf("Error marshaling JSON: %v\n", err)
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// Signal our ICE candidates
			res, err := options.HttpClient.PostForm(
				options.DiscoverySrv+options.Endpoint,
				url.Values{"data": {string(candidatesJSON)}, "send-to": {replyTo}, "type": {strconv.Itoa(int(common.SignalMsgICE))}},
			)
			if err != nil {
				log.Printf("Couldn't signal ICE candidates to %v\n", options.DiscoverySrv+options.Endpoint)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}
			defer res.Body.Close()

			switch res.StatusCode {
			case 404:
				log.Printf("Signaling partner hung up, aborting!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			case 200:
				// Signaling is complete, so we can short circuit instead of awaiting the response body
				return 4, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// This code path should never be reachable
			// Borked!
			peerConnection.Close() // TODO: there's an err we should handle here
			return 0, []interface{}{}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 4
			// input[0]: *webrtc.PeerConnection
			// input[1]: chan *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			// input[3]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			connectionEstablished := input[1].(chan *webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			connectionClosed := input[3].(chan struct{})
			log.Printf("Consumer state 4, signaling complete!\n")

			select {
			case d := <-connectionEstablished:
				log.Printf("A WebRTC connection has been established!\n")
				return 5, []interface{}{peerConnection, d, connectionChange, connectionClosed}
			case <-time.After(options.NATFailTimeout):
				log.Printf("NAT failure, aborting!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 5
			// input[0]: *webrtc.PeerConnection
			// input[1]: *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			// input[3]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			d := input[1].(*webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			connectionClosed := input[3].(chan struct{})

			// Send a path assertion IPC message representing the connectivity now provided by this slot
			// TODO: post-MVP we shouldn't be hardcoding (*, 1) here...
			allowAll := []common.Endpoint{{Host: "*", Distance: 1}}
			com.tx <- IPCMsg{IpcType: PathAssertionIPC, Data: common.PathAssertion{Allow: allowAll}}

			// Inbound from datachannel:
			d.OnMessage(func(msg webrtc.DataChannelMessage) {
				select {
				case com.tx <- IPCMsg{IpcType: ChunkIPC, Data: msg.Data}:
					// Do nothing, msg sent
				default:
					// Drop the chunk if we can't keep up with the data rate
				}
			})

		proxyloop:
			for {
				select {
				// Handle connection failure
				case s := <-connectionChange:
					if s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateDisconnected {
						log.Printf("Connection failure, resetting!\n")
						break proxyloop
					}
				// Handle connection failure for Firefox
				case _ = <-connectionClosed:
					log.Printf("Firefox connection failure, resetting!\n")
					break proxyloop
					// Handle messages from the router
				case msg := <-com.rx:
					switch msg.IpcType {
					case ChunkIPC:
						if err := d.Send(msg.Data.([]byte)); err != nil {
							log.Printf("Error sending to datachannel, resetting!\n")
							break proxyloop
						}
					}
					// Since we're putting this state into an infinite loop, explicitly handle cancellation
				case <-ctx.Done():
					break proxyloop
				}
			}

			peerConnection.Close() // TODO: there's an err we should handle here
			return 0, []interface{}{}
		}),
	})
}
