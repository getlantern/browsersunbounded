// producer.go defines standard producer behavior over WebRTC, including the discovery process,
// signaling, connection establishment, connection error detection, and reset. See:
// https://docs.google.com/spreadsheets/d/1qM1gwPRtTKTFfZZ0e51R7AdS6qkPlKMuJX3D3vmpG_U/edit#gid=471342300
package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "net/http"
  "net/url"
  "strconv"
  "time"
  
  "github.com/pion/webrtc/v3"
  "github.com/getlantern/broflake/common"
)

func newProducerWebRTC() *workerFSM {
  return newWorkerFSM([]FSMstate{
    FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
      // State 0
      // (no input data)
      fmt.Printf("Producer state 0, constructing RTCPeerConnection...\n")
      
      // We're resetting this slot, so announce the nil connectivity situation
      select {
      case com.tx <-ipcMsg{ipcType: ConsumerInfoIPC, data: common.ConsumerInfo{}}:
        // Do nothing, message sent
      default:
        panic("Producer buffer overflow")
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
      peerConnection.OnDataChannel(func(d *webrtc.DataChannel) {
        fmt.Printf("Created new datachannel...\n")

        d.OnOpen(func() {
          fmt.Printf("A datachannel has opened!\n")
          connectionEstablished <- d
        }) 
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
      fmt.Printf("Producer state 1...\n")
      
      // Do we have a non-nil path assertion, indicating that we have upstream connectivity to share?
      // We find out by sending an ConnectivityCheckIPC message, which asks the process responsible 
      // for path assertions to send a message reflecting the current state of our path assertion. 
      // If yes, we can proceed right now! If no, just wait for the next non-nil path assertion message...
      select {
      case com.tx <- ipcMsg{ipcType: ConnectivityCheckIPC}:
        // Do nothing, message sent
      default:
        panic("Producer buffer overflow!")
      }

      for {
        msg := <-com.rx
        if msg.ipcType == PathAssertionIPC && !msg.data.(common.PathAssertion).Nil() {
          pa := msg.data.(common.PathAssertion)
          return 2, []interface{}{peerConnection, pa, connectionEstablished, connectionChange}
        }
      }
    }),
    FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
      // State 2
      // input[0]: *webrtc.PeerConnection
      // input[1]: common.PathAssertion
      // input[2]: chan *webrtc.DataChannel
      // input[3]: chan webrtc.PeerConnectionState
      peerConnection := input[0].(*webrtc.PeerConnection)
      pa := input[1].(common.PathAssertion)
      connectionEstablished := input[2].(chan *webrtc.DataChannel)
      connectionChange := input[3].(chan webrtc.PeerConnectionState)
      fmt.Printf("Producer state 2...\n")

      // Construct a genesis message
      g := common.GenesisMsg{PathAssertion: pa,}.ToJSON()

      // Signal the genesis message
      // TODO: use a custom http.Client and control our TCP connections
      res, err := http.PostForm(
        discoverySrv + signalEndpoint, 
        url.Values{"data": {string(g)}, "send-to": {genesisAddr}, "type": {strconv.Itoa(int(common.SignalMsgGenesis))}},
      )
      if err != nil {
        fmt.Printf("Couldn't signal genesis message to %v\n", discoverySrv + signalEndpoint)
        return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
      }
      defer res.Body.Close()      
      
      // Freddie never returns 404s for genesis messages, so we're not catching that case here

      // The HTTP request is complete
      offerBytes, err := ioutil.ReadAll(res.Body)
      if err != nil {
        return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
      }
      
      // TODO: Freddie sends back a 0-length body when nobody replied to our message. Is that the
      // smartest way to handle this case systemwide?
      if len(offerBytes) == 0 {
        fmt.Printf("No answer for genesis message!\n")
        return 1, []interface{}{peerConnection, connectionEstablished, connectionChange}
      }
      
      // Looks like we got some kind of response. It ought to be an offer SDP wrapped in a SignalMsg
      // TODO: we ought to be getting an error back from DecodeSignalMsg if it's malformed
      replyTo, offer := common.DecodeSignalMsg(offerBytes)
      
      // TODO: here we assume we've received a valid offer SDP, we also need to handle invalid case
      return 3, []interface{}{peerConnection, replyTo, offer, connectionEstablished, connectionChange}
    }),
    FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
      // State 3
      // input[0]: *webrtc.PeerConnection
      // input[1]: string (replyTo)
      // input[2]: webrtc.SessionDescription (remote offer)
      // input[3]: chan *webrtc.DataChannel
      // input[4]: chan webrtc.PeerConnectionState
      peerConnection := input[0].(*webrtc.PeerConnection)
      replyTo := input[1].(string)
      offer := input[2].(webrtc.SessionDescription)
      connectionEstablished := input[3].(chan *webrtc.DataChannel)
      connectionChange := input[4].(chan webrtc.PeerConnectionState)
      fmt.Printf("Producer state 3...\n")

      // Create a channel that's blocked until ICE gathering is complete
      gatherComplete := webrtc.GatheringCompletePromise(peerConnection)
      
      // Assign the offer to our connection
      err := peerConnection.SetRemoteDescription(offer)
      if err != nil {
        // TODO: Definitely shouldn't panic here, it just indicates the offer is malformed
        panic(err)
      }
      
      // Generate an answer
      answer, err := peerConnection.CreateAnswer(nil)
      if err != nil {
        panic(err)
      }
      
      // This kicks off ICE candidate gathering
      err = peerConnection.SetLocalDescription(answer)
      if err != nil {
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
      
      // Our answer SDP with ICE candidates attached
      finalAnswer := peerConnection.LocalDescription()
      
      a, err := json.Marshal(finalAnswer)
      if err != nil {
        panic(err)
      }

      // Signal our answer
      // TODO: use a custom http.Client and control our TCP connections
      res, err := http.PostForm(
        discoverySrv + signalEndpoint, 
        url.Values{"data": {string(a)}, "send-to": {replyTo}, "type": {strconv.Itoa(int(common.SignalMsgAnswer))}},
      )
      if err != nil {
        fmt.Printf("Couldn't signal answer SDP to %v\n", discoverySrv + signalEndpoint)
        // Borked!
        peerConnection.Close()  // TODO: there's an err we should handle here
        return 0, []interface{}{}
      }
      defer res.Body.Close()      
      
      // Our signaling partner hung up
      if res.StatusCode == 404 {
        fmt.Printf("Signaling partner hung up, aborting!\n")
        // Borked!
        peerConnection.Close() // TODO: there's an err we should handle here
        return 0, []interface{}{}
      }
      
      // The HTTP request is complete
      iceBytes, err := ioutil.ReadAll(res.Body)
      if err != nil {
        // Borked!
        peerConnection.Close()  // TODO: there's an err we should handle here
        return 0, []interface{}{}
      }
      
      // TODO: Freddie sends back a 0-length body when our signaling partner doesn't reply. 
      // Is that the smartest way to handle this case systemwide?
      if len(iceBytes) == 0 {
        fmt.Printf("No ICE candidates from signaling partner!\n")
        // Borked!
        peerConnection.Close()  // TODO: there's an err we should handle here
        return 0, []interface{}{}
      }
      
      // Looks like we got some kind of response. Should be a slice of ICE candidates in a SignalMsg
      // TODO: we ought to be getting an error back from DecodeSignalMsg if it's malformed
      replyTo, candidates := common.DecodeSignalMsg(iceBytes)
      
      // TODO: here we assume valid candidates, but we need to handle the invalid case too
      for _, c := range candidates.([]webrtc.ICECandidate) {
        // TODO: webrtc.AddICECandidate accepts ICECandidateInit types, which are apparently
        // just serialized ICECandidates?
        peerConnection.AddICECandidate(c.ToJSON())
      }
      
      return 4, []interface{}{peerConnection, connectionEstablished, connectionChange}
    }),
    FSMstate(func(com *ipcChan, input []interface{}) (int, []interface{}) {
      // State 4
      // input[0]: *webrtc.PeerConnection
      // input[1]: chan *webrtc.DataChannel
      // input[2]: chan webrtc.PeerConnectionState
      peerConnection := input[0].(*webrtc.PeerConnection)
      connectionEstablished := input[1].(chan *webrtc.DataChannel)
      connectionChange := input[2].(chan webrtc.PeerConnectionState)
      fmt.Printf("Producer state 4, signaling complete!\n")

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
      
      fmt.Printf("Producer state 5...\n")
      
      // Announce the new connectivity situation for this slot
      // TODO: actually acquire the location
      select {
      case com.tx <-ipcMsg{ipcType: ConsumerInfoIPC, data: common.ConsumerInfo{Location: "DEBUG"}}:
        // Do nothing, message sent
      default:
        panic("Producer buffer overflow")
      }

      // Inbound from datachannel:
      d.OnMessage(func(msg webrtc.DataChannelMessage) {
        select {
        case com.tx <-ipcMsg{ipcType: ChunkIPC, data: msg.Data}:
          // Do nothing, message sent
        default:
          panic("Producer buffer overflow!")
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
