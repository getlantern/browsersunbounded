package freddie

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
	"golang.org/x/mod/semver"

	"github.com/getlantern/broflake/common"
)

const (
	consumerTTL = 20
	msgTTL      = 5
	bufferSz    = 16384
)

var (
	consumerTable = userTable{Data: make(map[string]chan string)}
	signalTable   = userTable{Data: make(map[string]chan string)}
)

type userTable struct {
	Data map[string]chan string
	sync.RWMutex
}

func (t *userTable) Add(userID string) chan string {
	t.Lock()
	defer t.Unlock()
	t.Data[userID] = make(chan string, bufferSz)
	return t.Data[userID]
}

func (t *userTable) Delete(userID string) {
	t.Lock()
	defer t.Unlock()
	delete(t.Data, userID)
}

func (t *userTable) Send(userID string, msg string) bool {
	t.Lock()
	defer t.Unlock()
	userChan, ok := t.Data[userID]
	if ok {
		userChan <- msg
	}
	return ok
}

func (t *userTable) SendAll(msg string) {
	t.Lock()
	defer t.Unlock()
	for _, userChan := range t.Data {
		userChan <- msg
	}
}

func (t *userTable) Size() int {
	t.RLock()
	defer t.RUnlock()
	return len(t.Data)
}

type Freddie struct {
	TLSConfig *tls.Config

	ctx context.Context
	srv *http.Server

	nConcurrentGetReqs  metric.Int64UpDownCounter
	nConcurrentPostReqs metric.Int64UpDownCounter
}

func New(ctx context.Context, listenAddr string) (Freddie, error) {
	f := Freddie{
		ctx: ctx,
		srv: &http.Server{
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
			Addr:         listenAddr,
		},
	}

	var err error

	m := otel.Meter("github.com/getlantern/broflake/freddie")
	f.nConcurrentGetReqs, err = m.Int64UpDownCounter("concurrent-get-reqs")
	if err != nil {
		return Freddie{}, err
	}
	f.nConcurrentPostReqs, err = m.Int64UpDownCounter("concurrent-post-reqs")
	if err != nil {
		return Freddie{}, err
	}

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("freddie (%v)\n", common.Version)))
	})
	http.HandleFunc("/v1/signal", f.handleSignal)

	return f, nil
}

func (f *Freddie) ListenAndServe() error {
	common.Debugf("Freddie (%v) listening on %v", common.Version, f.srv.Addr)
	return f.srv.ListenAndServe()
}

func (f *Freddie) ListenAndServeTLS(certFile, keyFile string) error {
	f.srv.TLSConfig = f.TLSConfig

	common.Debugf("Freddie (%v/tls) listening on %v", common.Version, f.srv.Addr)
	return f.srv.ListenAndServeTLS(certFile, keyFile)
}

func (f *Freddie) Shutdown() error {
	return f.srv.Shutdown(f.ctx)
}

func (f *Freddie) handleSignal(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)

	// Handle preflight requests
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Credentials", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT")
		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, "+
				"Access-Control-Request-Method, Access-Control-Request-Headers, "+common.VersionHeader,
		)

		w.WriteHeader(http.StatusOK)
		return
	}

	if !isValidProtocolVersion(r) {
		w.WriteHeader(http.StatusTeapot)
		w.Write([]byte("418\n"))
		return
	}

	switch r.Method {
	case http.MethodGet:
		f.handleSignalGet(w, r)
	case http.MethodPost:
		f.handleSignalPost(w, r)
	}
}

// GET /v1/signal is the producer advertisement stream
func (f *Freddie) handleSignalGet(w http.ResponseWriter, r *http.Request) {
	f.nConcurrentGetReqs.Add(context.Background(), 1)
	defer f.nConcurrentGetReqs.Add(context.Background(), -1)

	consumerID := uuid.NewString()
	consumerChan := consumerTable.Add(consumerID)
	defer consumerTable.Delete(consumerID)
	// common.Debugf("New consumer listening (%v) | total consumers: %v", consumerID, consumerTable.Size())

	// TODO: Matchmaking would happen here. (Just be selective about which consumers you broadcast
	// to, and you've implemented matchmaking!) If consumerTable was an indexed datastore, we could
	// select slices of consumers in O(1) based on some deterministic function
	w.WriteHeader(http.StatusOK)
	timeoutChan := time.After(consumerTTL * time.Second)

	for {
		select {
		case msg := <-consumerChan:
			w.Write([]byte(fmt.Sprintf("%v\n", msg)))
			w.(http.Flusher).Flush()
		case <-timeoutChan:
			// common.Debugf("Consumer %v timeout, bye bye!", consumerID)
			return
		}
	}
}

// POST /v1/signal is how all signaling messaging is performed
func (f *Freddie) handleSignalPost(w http.ResponseWriter, r *http.Request) {
	f.nConcurrentPostReqs.Add(context.Background(), 1)
	defer f.nConcurrentPostReqs.Add(context.Background(), -1)

	reqID := uuid.NewString()
	reqChan := signalTable.Add(reqID)
	defer signalTable.Delete(reqID)

	r.ParseForm()
	sendTo := r.Form.Get("send-to")
	data := r.Form.Get("data")
	msgType, err := strconv.ParseInt(r.Form.Get("type"), 10, 32)
	if err != nil {
		// Malformed request
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	// common.Debugf(
	// 	"New msg (%v) -> %v: %v | total open messages: %v",
	// 	reqID,
	// 	sendTo,
	// 	data,
	// 	signalTable.Size(),
	// )

	// Package the message
	msg, err := json.Marshal(
		common.SignalMsg{ReplyTo: reqID, Type: common.SignalMsgType(msgType), Payload: data},
	)
	if err != nil {
		// Malformed request
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	if sendTo == "genesis" {
		// It's a genesis message, so let's broadcast it to all consumers
		consumerTable.SendAll(string(msg))
	} else {
		// It's a regular message, so let's signal it to its recipient (or return a 404 if the
		// recipient is no longer available)
		ok := signalTable.Send(sendTo, string(msg))
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("404\n"))
			return
		}
	}

	// Send 200 OK to indicate that signaling partner accepts the message, stream back their
	// response or a nil body if they failed to respond
	w.WriteHeader(http.StatusOK)

	// XXX: If the sender has just sent a SignalMsgICE, there are no more steps in the signaling
	// handshake, so we'll close the request immediately. Being aware of message contents here is
	// very un-Freddie-like! We previously implemented this short circuit behavior on the client side,
	// but it required a Flush() here to push the status header to the client. The Flush() confuses
	// the browser and breaks Golang context contracts in wasm build targets, so we live with this hack.
	if common.SignalMsgType(msgType) == common.SignalMsgICE {
		w.Write(nil)
		return
	}

	select {
	case res := <-reqChan:
		w.Write([]byte(fmt.Sprintf("%v\n", res)))
	case <-time.After(msgTTL * time.Second):
		// common.Debugf("Msg %v received no reply, bye bye!", reqID)
		w.Write(nil)
	}
}

// TODO: delete me and replace with a real CORS strategy!
func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
}

// Validate the Broflake protocol version header. If the header isn't present, we consider you
// invalid. Protocol version is currently the major version of Broflake's reference implementation
func isValidProtocolVersion(r *http.Request) bool {
	if semver.Major(r.Header.Get(common.VersionHeader)) != semver.Major(common.Version) {
		return false
	}

	return true
}
