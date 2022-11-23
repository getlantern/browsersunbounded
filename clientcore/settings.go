package clientcore

import (
	"time"
)

type WebRTCOptions struct {
	DiscoverySrv   string
	Endpoint       string
	StunSrv        string
	GenesisAddr    string
	NATFailTimeout time.Duration
	ICEFailTimeout time.Duration
}

type EgressOptions struct {
	Addr           string
	Endpoint       string
	ConnectTimeout time.Duration
}
