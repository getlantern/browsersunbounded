package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/getlantern/broflake/common"
	"github.com/google/uuid"
)

const (
	consumerTTL = 20
	msgTTL      = 5
	bufferSz    = 16384
)

var consumerTable = userTable{Data: make(map[string]chan string)}
var signalTable = userTable{Data: make(map[string]chan string)}

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
	switch r.Method {
	case http.MethodGet:
		handleSignalGet(w, r)
	case http.MethodPost:
		handleSignalPost(w, r)
	}
}

// GET /v1/signal is the producer advertisement stream
func handleSignalGet(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	consumerID := uuid.NewString()
	consumerChan := consumerTable.Add(consumerID)
	defer consumerTable.Delete(consumerID)
	log.Printf("New consumer listening (%v) | total consumers: %v\n", consumerID, consumerTable.Size())

	// TODO: Matchmaking would happen here. (Just be selective about which consumers you broadcast
	// to, and you've implemented matchmaking!) If consumerTable was an indexed datastore, we could
	// select slices of consumers in O(1) based on some deterministic function
	w.WriteHeader(http.StatusOK)

	select {
	case msg := <-consumerChan:
		w.Write([]byte(fmt.Sprintf("%v\n", msg)))
		w.(http.Flusher).Flush()
	case <-time.After(consumerTTL * time.Second):
		log.Printf("Consumer %v timeout, bye bye!\n", consumerID)
	}
}

// POST /v1/signal is how all signaling messaging is performed
func handleSignalPost(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
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

func main() {
	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Addr:         ":8000",
	}
	http.HandleFunc("/v1/signal", handleSignal)
	log.Printf("Discovery server listening on %v\n\n", srv.Addr)
	err := srv.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}
