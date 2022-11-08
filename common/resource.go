package common

import (
	"encoding/json"

	"github.com/pion/webrtc/v3"
)

const (
	SignalMsgGenesis SignalMsgType = iota
	SignalMsgOffer
	SignalMsgAnswer
	SignalMsgICE
)

type SignalMsgType int

type PathAssertion struct {
	Allow []Endpoint
	Deny  []Endpoint
}

func (pa PathAssertion) Nil() bool {
	return len(pa.Allow) == 0 && len(pa.Deny) == 0
}

// TODO: ConsumerInfo is the downstream counterpart to PathAssertion. It's meant to describe
// useful information about a downstream connectivity situation. Like PathAssertion, a Nil()
// ConsumerInfo indicates no connectivity. ConsumerInfo lives here both to keep things consistent
// and because we imagine that ConsumerInfo objects may be served by Freddie, who will also perform
// the required IP geolocation during the discovery and matchmaking process. ConsumerInfo might one
// day evolve to become the consumer-side constraints object which is discussed in the RFCs, at
// which point it might make sense to collapse PathAssertion and ConsumerInfo into a single concept.
// ConsumerInfo (and its client-specific accomplice, ConsumerInfoIPC) were motivated solely to
// provide UI status information, and it's irksome that they exist for this reason alone.
type ConsumerInfo struct {
	Location string
}

func (ci ConsumerInfo) Nil() bool {
	return ci.Location == ""
}

type Endpoint struct {
	Host     string
	Distance uint
}

type GenesisMsg struct {
	PathAssertion PathAssertion
}

func (msg GenesisMsg) ToJSON() []byte {
	g, err := json.Marshal(msg)
	if err != nil {
		panic(err)
	}
	return g
}

type SignalMsg struct {
	ReplyTo string
	Type    SignalMsgType
	Payload string
}

// TODO: These definitely shouldn't panic, because we use them to validate response messages,
// but we'll just delete this whole mess when we swap in protobufs anyway
func DecodeSignalMsg(raw []byte) (string, interface{}) {
	var msg SignalMsg
	err := json.Unmarshal(raw, &msg)
	if err != nil {
		panic(err)
	}

	switch msg.Type {
	case SignalMsgGenesis:
		var genesis GenesisMsg
		err := json.Unmarshal([]byte(msg.Payload), &genesis)
		if err != nil {
			panic(err)
		}
		return msg.ReplyTo, genesis
	case SignalMsgOffer:
		var offer webrtc.SessionDescription
		err := json.Unmarshal([]byte(msg.Payload), &offer)
		if err != nil {
			panic(err)
		}
		return msg.ReplyTo, offer
	case SignalMsgAnswer:
		var answer webrtc.SessionDescription
		err := json.Unmarshal([]byte(msg.Payload), &answer)
		if err != nil {
			panic(err)
		}
		return msg.ReplyTo, answer
	case SignalMsgICE:
		var candidates []webrtc.ICECandidate
		err := json.Unmarshal([]byte(msg.Payload), &candidates)
		if err != nil {
			panic(err)
		}
		return msg.ReplyTo, candidates
	}
	return "", nil
}
