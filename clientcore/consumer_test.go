package clientcore

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/h2non/gock"
	"github.com/pion/webrtc/v3"
	"github.com/stretchr/testify/assert"

	"github.com/getlantern/broflake/common"
)

// *************************************************************
//
//	FSMstate0 Tests
//
// *************************************************************
func TestCreatePeerConnection(t *testing.T) {
	com := &ipcChan{
		tx: make(chan IPCMsg, 1),
		rx: make(chan IPCMsg, 1),
	}
	opts, stunReqC := getTestOpts()
	state, values := newFSMstate0(opts)(context.Background(), com, nil)

	assert.Len(t, stunReqC, 1, "FSMstate0: did not request STUN servers")

	// check that a nil PathAssertion IPCMsg was sent over com.tx
	var nilPA bool
	select {
	case msg := <-com.tx:
		nilPA = (msg.IpcType == PathAssertionIPC && msg.Data.(common.PathAssertion).Nil())
	default:
	}

	assert.True(t, nilPA, "FSMstate0: did not send nil PathAssertion")
	validateState(t, state, 1, "FSMstate0: failed to create peer connection")

	// validate offerer was set up correctly by creating a mock answerer and signaling it
	pcOff, ok := values[0].(*webrtc.PeerConnection)
	if !ok {
		assert.IsType(t, &webrtc.PeerConnection{}, values[0], "FSMstate0: expected returnedValues[0] to be a *webrtc.PeerConnection")
	}

	pcOffererConnChangeC, ok := values[2].(chan webrtc.PeerConnectionState)
	if !ok {
		var cType chan webrtc.PeerConnectionState
		assert.IsType(t, cType, values[2], "FSMstate0: expected returnedValues[2] to be a chan webrtc.PeerConnectionState")
	}

	if !ok {
		assert.FailNow(t, "FSMstate0: did not return expected values")
	}
	defer pcOff.Close()

	// create mock answerer and try to send signal between offerer and answerer
	pcAnswerer, err := newPeerConn()
	assertFailIfErr(t, err, "FSMstate0: failed to create mock answerer")
	defer pcAnswerer.pc.Close()

	err = signalSDP(pcOff, pcAnswerer.pc)
	assertFailIfErr(t, err, "FSMstate0: peerConnection failed to signal mock answerer. Ensure a data channel was reated")

	err = waitUntilConnected(pcOffererConnChangeC, pcAnswerer.connChangeC, 5*time.Second)
	assertFailIfErr(t, err, "FSMstate0: peerConnection failed to connect to mock answerer. Ensure connection state is being sent over connectionChange chan")
}

// func TestState0FailToGetSTUNBatch(t *testing.T) {}

// *************************************************************
//
//	FSMstate1 Tests
//
// *************************************************************
func TestCreateOffer(t *testing.T) {
	var (
		signalMsg = common.SignalMsg{
			ReplyTo: "someone",
			Type:    common.SignalMsgGenesis,
			Payload: "{}",
		}

		connEstablished chan *webrtc.DataChannel
		connChanged     chan webrtc.PeerConnectionState
		connClosed      chan struct{}
	)

	pcOfferer, err := newOfferer()
	assertFailIfErr(t, err, "FSMstate1: failed to create mock offerer")
	defer pcOfferer.pc.Close()

	opts, _ := getTestOpts()

	// intercept request for genesis message
	defer gock.Off()
	gock.New(opts.DiscoverySrv).
		Get(opts.Endpoint).
		Reply(200).
		JSON(signalMsg)
	gock.InterceptClient(opts.HttpClient)

	values := []interface{}{pcOfferer.pc, connEstablished, connChanged, connClosed}
	state, values := newFSMstate1(opts)(context.Background(), nil, values)
	validateState(t, state, 2, "FSMstate1: failed to create offer")

	assert.Equal(t, signalMsg.ReplyTo, values[1], "FSMstate1: returnedValues[1] does not match expected 'replyTo'")
	assert.IsType(t, webrtc.SessionDescription{}, values[2], "FSMstate1: expected returnedValues[2] to be an offer webrtc.SessionDescription")
}

// func TestState1GenesisMsgReqTimeout(t *testing.T) {}

// func TestState1GenesisMsgReqBadProtocalResponse(t *testing.T) {}

// func TestState1NoGenesisReceived(t *testing.T) {}

// *************************************************************
//
//	FSMstate2 Tests
//
// *************************************************************
func TestGatherICECandidates(t *testing.T) {
	var (
		replyTo         = "someone"
		connEstablished chan *webrtc.DataChannel
		connChanged     chan webrtc.PeerConnectionState
		connClosed      chan struct{}
	)

	pcAnswerer, err := newPeerConn()
	assertFailIfErr(t, err, "FSMstate2: failed to create mock answerer")
	defer pcAnswerer.pc.Close()

	opts, _ := getTestOpts()

	// intercept offer request
	defer gock.Off()
	gock.New(opts.DiscoverySrv).
		Post(opts.Endpoint).
		MatchType("url")

	opts.HttpClient.Transport = &mockSignalMsgTransport{
		pcAns:          pcAnswerer.pc,
		ICEFailTimeout: opts.ICEFailTimeout,
	}

	pcOfferer, err := newOfferer()
	assertFailIfErr(t, err, "FSMstate2: failed to create mock offerer")
	defer pcOfferer.pc.Close()

	sdp, err := pcOfferer.pc.CreateOffer(nil)
	assert.NoError(t, err)

	values := []interface{}{pcOfferer.pc, replyTo, sdp, connEstablished, connChanged, connClosed}
	state, _ := newFSMstate2(opts)(context.Background(), nil, values)
	validateState(t, state, 3, "FSMstate2: failed to connect to answerer")
}

// func TestRequestAnswerBadProtocalResponse(t *testing.T) {}

// TODO: @nelson, this may need to be renamed as I don't know if this is the right description for what's happening
// func TestRequestAnswerGenesisMsgExpired(t *testing.T) {}

// func TestRequestAnswerNoAnswerReceived(t *testing.T) {}

// func TestRequestAnswerIceCandidateTimeout(t *testing.T) {}

// *************************************************************
//
//	FSMstate3 Tests
//
// *************************************************************
func TestSignalICECandidates(t *testing.T) {
	var (
		replyTo    = "someone"
		candidates = []webrtc.ICECandidate{
			{Foundation: "foundation1", Priority: 1},
			{Foundation: "foundation2", Priority: 2},
			{Foundation: "foundation3", Priority: 3},
		}

		connEstablished chan *webrtc.DataChannel
		connChanged     chan webrtc.PeerConnectionState
		connClosed      chan struct{}
	)

	opts, _ := getTestOpts()

	// intercept ICE candidate request
	defer gock.Off()
	gock.New(opts.DiscoverySrv).
		Post(opts.Endpoint).
		MatchType("url")

	opts.HttpClient.Transport = &mockSignalMsgTransport{}

	pcOfferer, err := newOfferer()
	assertFailIfErr(t, err, "FSMstate3: failed to create mock offerer")
	defer pcOfferer.pc.Close()

	values := []interface{}{pcOfferer.pc, replyTo, candidates, connEstablished, connChanged, connClosed}
	state, _ := newFSMstate3(opts)(context.Background(), nil, values)
	validateState(t, state, 4, "FSMstate3: failed to send ICE candidates")
}

// func TestSendICECandidatesBadProtocalResponse(t *testing.T) {}

// func TestSendICECandidatesSignalerHungUp(t *testing.T) {}

// *************************************************************
//
//	FSMstate4 Tests
//
// *************************************************************
func TestConnectionEstablished(t *testing.T) {
	var (
		pc  = &webrtc.PeerConnection{}
		dcC = make(chan *webrtc.DataChannel, 1)

		connChanged chan webrtc.PeerConnectionState
		connClosed  chan struct{}
	)

	dcC <- &webrtc.DataChannel{}
	opts, stunReqC := getTestOpts()

	values := []interface{}{pc, dcC, connChanged, connClosed}
	state, _ := newFSMstate4(opts)(context.Background(), nil, values)

	assert.Len(t, stunReqC, 1, "FSMstate4: did not request STUN servers")
	assert.Len(t, dcC, 0, "FSMstate4: did not recieve dataChannel")

	validateState(t, state, 5, "FSMstate4: failed to verify connection established")
}

// func TestState4FailToGetSTUNBatch(t *testing.T) {}

// func TestConnectionNATTimeout(t *testing.T) {}

// *************************************************************
//
//	FSMstate5 Tests
//
// *************************************************************
func TestDataProxying(t *testing.T) {
	var (
		connClosed chan struct{}
		com        = &ipcChan{
			tx: make(chan IPCMsg, 3),
			rx: make(chan IPCMsg),
		}
		stateC = make(chan int)
		dcOpen = make(chan bool)

		// test message and response
		konamiCode = "uuddlrlrba" // hack the system ;)
		inputRes   = "cheat activated"
	)

	// create mock offerer and answerer
	pcOfferer, err := newOfferer()
	assertFailIfErr(t, err, "FSMstate5: failed to create mock offerer")
	defer pcOfferer.pc.Close()

	pcAnswerer, err := newPeerConn()
	assertFailIfErr(t, err, "FSMstate5: failed to create mock answerer")
	defer pcAnswerer.pc.Close()

	// set up data channel on answerer to validate the correct message is received
	// and send back a response
	pcAnswerer.pc.OnDataChannel(func(dc *webrtc.DataChannel) {
		dc.OnMessage(func(msg webrtc.DataChannelMessage) {
			// validate data is received and is correct msg
			if assert.Equal(t, string(msg.Data), konamiCode, "FSMstate5: did not proxy correct msg") {
				dc.Send([]byte(inputRes))
			}
		})
		dc.OnOpen(func() {
			dcOpen <- true
		})
	})

	if err = signalSDP(pcOfferer.pc, pcAnswerer.pc); err != nil {
		assert.FailNow(t, "FSMstate5: peerConnection failed to signal mock answerer")
	}

	// wait for data channel to open
	select {
	case <-dcOpen:
	case <-time.After(5 * time.Second):
		assert.FailNow(t, "FSMstate5: data channel did not open")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer func() {
		if ctx.Err() == nil {
			cancel()
			time.Sleep(250 * time.Millisecond)
		}
	}()

	opts, _ := getTestOpts()
	go func() {
		values := []interface{}{pcOfferer.pc, pcOfferer.dc, pcOfferer.connChangeC, connClosed}
		state, _ := newFSMstate5(opts)(ctx, com, values)
		stateC <- state
	}()

	// wait for a non-nil PathAssertion IPCMsg
	select {
	case msg := <-com.tx:
		if msg.IpcType != PathAssertionIPC || msg.Data.(common.PathAssertion).Nil() {
			assert.Failf(t, "FSMstate5: expected non-nil PathAssertion IPCMsg", "got %+v", msg)
		}
	case <-time.After(250 * time.Millisecond):
		assert.Fail(t, "FSMstate5: did not send PathAssertion IPCMsg")
	}

	// send ChunkIPC IPCMsg with our test msg
	// this will be sent over com.rx to a consumer in FSMstate5 which will proxy it to the answerer
	// over the peerConnection data channel. The answerer will then respond with inputRes which the
	// consumer will forward directly over com.tx
	msg := IPCMsg{
		IpcType: ChunkIPC,
		Data:    []byte(konamiCode),
	}
	select {
	case com.rx <- msg:
		// validate response is received on com.tx
		select {
		case msg := <-com.tx:
			assert.Equal(t, string(msg.Data.([]byte)), inputRes, "FSMstate5: did not proxy correct response")
		case <-time.After(2 * time.Second):
			assert.Fail(t, "FSMstate5: did not send response msg over com.tx")
		}
	case <-time.After(500 * time.Millisecond):
		assert.Fail(t, "FSMstate5: did not read msg from com.rx")
	}

	// signal that we're done and the connection should be closed
	cancel()
	select {
	case state := <-stateC:
		validateState(t, state, 0, "FSMstate5: failed to reset FSM")
	case <-time.After(500 * time.Millisecond):
		assert.Fail(t, "FSMstate5: did not cancel connection and reset FSM")
	}
}

// func TestFailedConnection(t *testing.T) {}

// func TestConnectionClosed(t *testing.T) {}

// *************************************************************
//
//	helper funcs
//
// *************************************************************
// validateState validates gotState equals wantState
// otherwise fails test immediately with failMsg
func validateState(t *testing.T, gotState, wantState int, failMsg string) {
	if !assert.Equal(t, wantState, gotState, "should be in state %d", wantState) {
		assert.FailNow(t, failMsg)
	}
}

type peerConn struct {
	pc          *webrtc.PeerConnection
	connChangeC chan webrtc.PeerConnectionState
	dc          *webrtc.DataChannel
}

func newOfferer() (*peerConn, error) {
	conn, err := newPeerConn()
	if err != nil {
		return nil, err
	}

	conn.dc, err = conn.pc.CreateDataChannel("data_chan", nil)
	return conn, err
}

func newPeerConn() (*peerConn, error) {
	pc, err := webrtc.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		return nil, err
	}

	conn := peerConn{
		pc:          pc,
		connChangeC: make(chan webrtc.PeerConnectionState),
	}

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		conn.connChangeC <- state
	})
	return &conn, nil
}

// signalSDP creates an offer and answer and signals them between the two peerConnections.
// Returns nil if successful, otherwise returns error.
func signalSDP(pcOff, pcAns *webrtc.PeerConnection) error {
	offer, err := pcOff.CreateOffer(nil)
	if err != nil {
		return err
	}

	offererGatheringComplete := webrtc.GatheringCompletePromise(pcOff)
	if err = pcOff.SetLocalDescription(offer); err != nil {
		return err
	}

	<-offererGatheringComplete
	if err = pcAns.SetRemoteDescription(*pcOff.LocalDescription()); err != nil {
		return err
	}

	answer, err := pcAns.CreateAnswer(nil)
	if err != nil {
		return err
	}

	answererGatheringComplete := webrtc.GatheringCompletePromise(pcAns)
	if err = pcAns.SetLocalDescription(answer); err != nil {
		return err
	}

	<-answererGatheringComplete
	return pcOff.SetRemoteDescription(*pcAns.LocalDescription())
}

// waitUntilConnected waits until both offerer and answerer are connected
// Returns nil if successful, otherwise returns error.
func waitUntilConnected(pcO, pcA chan webrtc.PeerConnectionState, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	var wg sync.WaitGroup
	wait := func(stateC chan webrtc.PeerConnectionState) {
		defer wg.Done()
		for {
			select {
			case state := <-stateC:
				if state == webrtc.PeerConnectionStateConnected {
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}

	wg.Add(2)
	go wait(pcO)
	go wait(pcA)

	wg.Wait()
	return ctx.Err()
}

// getTestOpts returns the default WebRTCOptions with a mock STUNBatch function
// and a buffered channel to signal when the mock STUNBatch function is called. The
// discovery server and endpoint are set to a dummy value to prevent any
// requests from being sent.
func getTestOpts() (*WebRTCOptions, chan struct{}) {
	opts := NewDefaultWebRTCOptions()
	opts.DiscoverySrv = "http://server.com"
	opts.Endpoint = "/"

	c := make(chan struct{}, 1)
	opts.STUNBatch = func(size uint32) (batch []string, err error) {
		c <- struct{}{}
		return []string{}, nil
	}
	opts.STUNBatchSize = 1
	return opts, c
}

func assertFailIfErr(t *testing.T, err error, failMsg string) {
	if !assert.NoError(t, err) {
		assert.FailNow(t, failMsg, err)
	}
}

// mockSignalMsgTransport is a mock http.RoundTripper that intercepts SignalMsg requests.
// It then validates neither the data, send-to, or type fields are empty and sends the
// appropriate response based on the type field.
type mockSignalMsgTransport struct {
	mutex          sync.Mutex
	pcAns          *webrtc.PeerConnection
	ICEFailTimeout time.Duration
}

func (m *mockSignalMsgTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	m.mutex.Lock()
	mock, err := gock.MatchMock(req)
	if err != nil {
		m.mutex.Unlock()
		return nil, err
	}

	if err = req.ParseForm(); err != nil {
		m.mutex.Unlock()
		return nil, err
	}

	var (
		data    string
		sendTo  string
		msgType string
		httpRes *http.Response

		mockRes   = mock.Response()
		Responder = gock.Responder
	)

	// validate required fields (data, send-to, type) are present in request
	data = req.Form.Get("data")
	sendTo = req.Form.Get("send-to")
	msgType = req.Form.Get("type")
	m.mutex.Unlock()

	if data == "" {
		mockRes.Status(418).BodyString("missing data field in request")
		return Responder(req, mockRes, httpRes)
	}

	if sendTo == "" {
		mockRes.Status(418).BodyString("missing send-to field in request")
		return Responder(req, mockRes, httpRes)
	}

	mt, err := strconv.Atoi(msgType)
	if err != nil {
		mockRes.Status(418).BodyString(err.Error())
		return Responder(req, mockRes, httpRes)
	}

	switch common.SignalMsgType(mt) {
	case common.SignalMsgOffer:
		// parse offer from data field and create answer to send back
		var offerJSON common.OfferMsg
		if err = json.Unmarshal([]byte(data), &offerJSON); err != nil {
			mockRes.Status(418).BodyString(err.Error())
			return Responder(req, mockRes, httpRes)
		}

		pcAns := m.pcAns
		if err = pcAns.SetRemoteDescription(offerJSON.SDP); err != nil {
			mockRes.Status(418).BodyString(err.Error())
			return Responder(req, mockRes, httpRes)
		}

		answer, err := pcAns.CreateAnswer(nil)
		if err != nil {
			mockRes.Status(418).BodyString(err.Error())
			return Responder(req, mockRes, httpRes)
		}

		answererGatheringComplete := webrtc.GatheringCompletePromise(pcAns)
		if err = pcAns.SetLocalDescription(answer); err != nil {
			mockRes.Status(418).BodyString(err.Error())
			return Responder(req, mockRes, httpRes)
		}

		select {
		case <-answererGatheringComplete:
		case <-time.After(m.ICEFailTimeout):
			mockRes.Status(418).BodyString("answerer failed to gather ICE candidates")
			return Responder(req, mockRes, httpRes)
		}

		answerJSON, err := json.Marshal(pcAns.LocalDescription())
		if err != nil {
			mockRes.Status(418).BodyString(err.Error())
			return Responder(req, mockRes, httpRes)
		}

		signalMsg := common.SignalMsg{
			ReplyTo: sendTo,
			Type:    common.SignalMsgAnswer,
			Payload: string(answerJSON),
		}

		mockRes.JSON(signalMsg)
	case common.SignalMsgICE:
		// validate ICE candidates sent in data field
		var candidates []webrtc.ICECandidate
		if err = json.Unmarshal([]byte(data), &candidates); err != nil {
			mockRes.Status(418).BodyString("failed to unmarshal ICE candidates")
			return Responder(req, mockRes, httpRes)
		}
	}

	return Responder(req, mockRes.Status(200), httpRes)
}

// CancelRequest is a no-op function
func (m *mockSignalMsgTransport) CancelRequest(req *http.Request) {}
