// producer.go defines standard producer behavior over WebRTC, including the discovery process,
// signaling, connection establishment, connection error detection, and reset. See:
// https://docs.google.com/spreadsheets/d/1qM1gwPRtTKTFfZZ0e51R7AdS6qkPlKMuJX3D3vmpG_U/edit#gid=471342300
package clientcore

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/getlantern/broflake/common"
	"github.com/pion/webrtc/v3"
)

func NewProducerWebRTC(options *WebRTCOptions, wg *sync.WaitGroup) *WorkerFSM {
	return NewWorkerFSM(wg, []FSMstate{
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 0
			// (no input data)
			log.Printf("Producer state 0, constructing RTCPeerConnection...\n")

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

			// Producers are the answerers, so we don't create a datachannel

			// We want to make sure we capture the connection establishment event whenever it happens,
			// but we also want to avoid control flow spaghetti (it would very hard to reason about
			// client operation if we sometimes jump forward to future states based on async events
			// firing outside of the state machine). Solution: Pass forward this buffered channel such
			// that we can explicitly check for connection establishment in state 4. In theory, it's
			// possible that magical ICE mysteries could cause the connection to open as early as the end
			// of state 2. In practice, the differences here should be on the order of nanoseconds. But
			// we should monitor the logs to see if connections open too long before we check for them.
			connectionEstablished := make(chan *webrtc.DataChannel, 1)

			// connectionClosed (and the OnClose handler below) is implemented for Firefox, the only
			// browser which doesn't implement WebRTC's onconnectionstatechange event. We listen for both
			// onclose and onconnectionstatechange under the assumption that non-Firefox browsers can
			// benefit from faster connection failure detection by listening for the `failed` event.
			connectionClosed := make(chan struct{}, 1)
			peerConnection.OnDataChannel(func(d *webrtc.DataChannel) {
				log.Printf("Created new datachannel...\n")

				d.OnOpen(func() {
					log.Printf("A datachannel has opened!\n")
					connectionEstablished <- d
				})

				d.OnClose(func() {
					log.Printf("A datachannel has closed!\n")
					connectionClosed <- struct{}{}
				})
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
			log.Printf("Producer state 1...\n")

			// Do we have a non-nil path assertion, indicating that we have upstream connectivity to share?
			// We find out by sending an ConnectivityCheckIPC message, which asks the process responsible
			// for path assertions to send a message reflecting the current state of our path assertion.
			// If yes, we can proceed right now! If no, just wait for the next non-nil path assertion message...
			com.tx <- IPCMsg{IpcType: ConnectivityCheckIPC}

			for {
				select {
				// Handle inbound IPC messages, wait for a non-nil path assertion
				case msg := <-com.rx:
					if msg.IpcType == PathAssertionIPC && !msg.Data.(common.PathAssertion).Nil() {
						pa := msg.Data.(common.PathAssertion)
						return 2, []interface{}{peerConnection, pa, connectionEstablished, connectionChange, connectionClosed}
					}
				// Since we're putting this state into an infinite loop, explicitly handle cancellation
				case <-ctx.Done():
					return 0, []interface{}{}
				}
			}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 2
			// input[0]: *webrtc.PeerConnection
			// input[1]: common.PathAssertion
			// input[2]: chan *webrtc.DataChannel
			// input[3]: chan webrtc.PeerConnectionState
			// input[4]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			pa := input[1].(common.PathAssertion)
			connectionEstablished := input[2].(chan *webrtc.DataChannel)
			connectionChange := input[3].(chan webrtc.PeerConnectionState)
			connectionClosed := input[4].(chan struct{})
			log.Printf("Producer state 2...\n")

			// Construct a genesis message
			g, err := json.Marshal(common.GenesisMsg{PathAssertion: pa})
			if err != nil {
				log.Printf("Error marshaling JSON: %v\n", err)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// Signal the genesis message
			// TODO: use a custom http.Client and control our TCP connections
			res, err := http.PostForm(
				options.DiscoverySrv+options.Endpoint,
				url.Values{"data": {string(g)}, "send-to": {options.GenesisAddr}, "type": {strconv.Itoa(int(common.SignalMsgGenesis))}},
			)
			if err != nil {
				log.Printf("Couldn't signal genesis message to %v\n", options.DiscoverySrv+options.Endpoint)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}
			defer res.Body.Close()

			// Freddie never returns 404s for genesis messages, so we're not catching that case here

			// The HTTP request is complete
			offerBytes, err := ioutil.ReadAll(res.Body)
			if err != nil {
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// TODO: Freddie sends back a 0-length body when nobody replied to our message. Is that the
			// smartest way to handle this case systemwide?
			if len(offerBytes) == 0 {
				log.Printf("No answer for genesis message!\n")
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// Looks like we got some kind of response. It ought to be an offer SDP wrapped in a SignalMsg
			replyTo, offer, err := common.DecodeSignalMsg(offerBytes)
			if err != nil {
				log.Printf("Error decoding signal message: %v\n", err)
				return 1, []interface{}{peerConnection, connectionEstablished, connectionChange, connectionClosed}
			}

			// TODO: here we assume we've received a valid offer SDP, we also need to handle invalid case
			return 3, []interface{}{peerConnection, replyTo, offer, connectionEstablished, connectionChange, connectionClosed}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 3
			// input[0]: *webrtc.PeerConnection
			// input[1]: string (replyTo)
			// input[2]: common.OfferMsg (remote offer)
			// input[3]: chan *webrtc.DataChannel
			// input[4]: chan webrtc.PeerConnectionState
			// input[5]: chan struct{}
			peerConnection := input[0].(*webrtc.PeerConnection)
			replyTo := input[1].(string)
			offer := input[2].(common.OfferMsg)
			connectionEstablished := input[3].(chan *webrtc.DataChannel)
			connectionChange := input[4].(chan webrtc.PeerConnectionState)
			connectionClosed := input[5].(chan struct{})
			log.Printf("Producer state 3...\n")

			// Create a channel that's blocked until ICE gathering is complete
			gatherComplete := webrtc.GatheringCompletePromise(peerConnection)

			// Assign the offer to our connection
			err := peerConnection.SetRemoteDescription(offer.SDP)
			if err != nil {
				log.Printf("Error setting remote description: %v\n", err)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// Generate an answer
			answer, err := peerConnection.CreateAnswer(nil)
			if err != nil {
				log.Printf("Error creating answer SDP: %v\n", err)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// This kicks off ICE candidate gathering
			err = peerConnection.SetLocalDescription(answer)
			if err != nil {
				log.Printf("Error setting local description: %v\n", err)
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

			// Our answer SDP with ICE candidates attached
			finalAnswer := peerConnection.LocalDescription()

			a, err := json.Marshal(finalAnswer)
			if err != nil {
				log.Printf("Error marshaling JSON: %v\n", err)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// Signal our answer
			// TODO: use a custom http.Client and control our TCP connections
			res, err := http.PostForm(
				options.DiscoverySrv+options.Endpoint,
				url.Values{"data": {string(a)}, "send-to": {replyTo}, "type": {strconv.Itoa(int(common.SignalMsgAnswer))}},
			)
			if err != nil {
				log.Printf("Couldn't signal answer SDP to %v\n", options.DiscoverySrv+options.Endpoint)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}
			defer res.Body.Close()

			// Our signaling partner hung up
			if res.StatusCode == 404 {
				log.Printf("Signaling partner hung up, aborting!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// The HTTP request is complete
			iceBytes, err := ioutil.ReadAll(res.Body)
			if err != nil {
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// TODO: Freddie sends back a 0-length body when our signaling partner doesn't reply.
			// Is that the smartest way to handle this case systemwide?
			if len(iceBytes) == 0 {
				log.Printf("No ICE candidates from signaling partner!\n")
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			// Looks like we got some kind of response. Should be a slice of ICE candidates in a SignalMsg
			replyTo, candidates, err := common.DecodeSignalMsg(iceBytes)
			if err != nil {
				log.Printf("Error decoding signal message: %v\n", err)
				// Borked!
				peerConnection.Close() // TODO: there's an err we should handle here
				return 0, []interface{}{}
			}

			var remoteAddr net.IP

			// TODO: here we assume valid candidates, but we need to handle the invalid case too
			for _, c := range candidates.([]webrtc.ICECandidate) {
				// TODO: webrtc.AddICECandidate accepts ICECandidateInit types, which are apparently
				// just serialized ICECandidates?
				err := peerConnection.AddICECandidate(c.ToJSON())
				if err != nil {
					log.Printf("Error adding ICE candidate: %v\n", err)
					// Borked!
					peerConnection.Close() // TODO: there's an err we should handle here
					return 0, []interface{}{}
				}

				// We extract an address from the remote ICE candidates just to send it to the UI for
				// geolocation purposes. Under the assumption that any public address will suffice, we
				// arbitrarily select the last public address found in the list of candidates
				parsedIP := net.ParseIP(c.Address)
				if parsedIP != nil && common.IsPublicAddr(parsedIP) {
					remoteAddr = parsedIP
				}
			}

			return 4, []interface{}{
				peerConnection,
				connectionEstablished,
				connectionChange,
				connectionClosed,
				remoteAddr,
				offer,
			}
		}),
		FSMstate(func(ctx context.Context, com *ipcChan, input []interface{}) (int, []interface{}) {
			// State 4
			// input[0]: *webrtc.PeerConnection
			// input[1]: chan *webrtc.DataChannel
			// input[2]: chan webrtc.PeerConnectionState
			// input[3]: chan struct{}
			// input[4]: net.IP
			// input[5]: common.OfferMsg
			peerConnection := input[0].(*webrtc.PeerConnection)
			connectionEstablished := input[1].(chan *webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			connectionClosed := input[3].(chan struct{})
			remoteAddr := input[4].(net.IP)
			offer := input[5].(common.OfferMsg)
			log.Printf("Producer state 4, signaling complete!\n")

			select {
			case d := <-connectionEstablished:
				log.Printf("A WebRTC connection has been established!\n")
				return 5, []interface{}{
					peerConnection,
					d,
					connectionChange,
					connectionClosed,
					remoteAddr,
					offer,
				}
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
			// input[4]: net.IP
			// input[5]: common.OfferMsg
			peerConnection := input[0].(*webrtc.PeerConnection)
			d := input[1].(*webrtc.DataChannel)
			connectionChange := input[2].(chan webrtc.PeerConnectionState)
			connectionClosed := input[3].(chan struct{})
			remoteAddr := input[4].(net.IP)
			offer := input[5].(common.OfferMsg)
			log.Printf("Producer state 5...\n")

			// Announce the new connectivity situation for this slot
			com.tx <- IPCMsg{
				IpcType: ConsumerInfoIPC,
				Data:    common.ConsumerInfo{Addr: remoteAddr, Tag: offer.Tag},
			}

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

			// We've reset this slot, so announce the nil connectivity situation
			com.tx <- IPCMsg{IpcType: ConsumerInfoIPC, Data: common.ConsumerInfo{}}
			return 0, []interface{}{}
		}),
	})
}
