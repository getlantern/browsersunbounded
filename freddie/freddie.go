package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/getlantern/broflake/common"
	"github.com/getlantern/telemetry"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/metric/global"
	"go.opentelemetry.io/otel/metric/instrument"
	"golang.org/x/mod/semver"
)

const (
	consumerTTL = 20
	msgTTL      = 5
	bufferSz    = 16384
)

var consumerTable = userTable{Data: make(map[string]chan string)}
var signalTable = userTable{Data: make(map[string]chan string)}

var nConcurrentReqs instrument.Int64UpDownCounter

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

func handleSignal(w http.ResponseWriter, r *http.Request) {
	nConcurrentReqs.Add(r.Context(), 1)
	defer nConcurrentReqs.Add(r.Context(), -1)
	enableCors(&w)

	if !isValidProtocolVersion(r) {
		w.WriteHeader(http.StatusTeapot)
		w.Write([]byte("418\n"))
		return
	}

	switch r.Method {
	case http.MethodGet:
		handleSignalGet(w, r)
	case http.MethodPost:
		handleSignalPost(w, r)
	}
}

// GET /v1/signal is the producer advertisement stream
func handleSignalGet(w http.ResponseWriter, r *http.Request) {
	consumerID := uuid.NewString()
	consumerChan := consumerTable.Add(consumerID)
	defer consumerTable.Delete(consumerID)
	log.Printf("New consumer listening (%v) | total consumers: %v\n", consumerID, consumerTable.Size())

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
			log.Printf("Consumer %v timeout, bye bye!\n", consumerID)
			return
		}
	}
}

// POST /v1/signal is how all signaling messaging is performed
func handleSignalPost(w http.ResponseWriter, r *http.Request) {
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

	log.Printf(
		"New msg (%v) -> %v: %v | total open messages: %v\n",
		reqID,
		sendTo,
		data,
		signalTable.Size(),
	)

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

	select {
	case res := <-reqChan:
		w.Write([]byte(fmt.Sprintf("%v\n", res)))
	case <-time.After(msgTTL * time.Second):
		log.Printf("Msg %v received no reply, bye bye!\n", reqID)
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

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()
	closeFuncMetric := telemetry.EnableOTELMetrics(ctx)
	defer func() { _ = closeFuncMetric(ctx) }()

	m := global.Meter("github.com/getlantern/broflake/freddie")
	var err error
	nConcurrentReqs, err = m.Int64UpDownCounter("concurrent-reqs")
	if err != nil {
		panic(err)
	}

	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Addr:         fmt.Sprintf(":%v", port),
	}
	http.HandleFunc("/v1/signal", handleSignal)
	log.Printf("Freddie (%v) listening on %v\n\n", common.Version, srv.Addr)
	err = srv.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}
