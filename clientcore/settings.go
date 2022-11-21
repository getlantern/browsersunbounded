package clientcore

import (
	"time"
)

type WebRTCOptions struct {
	DiscoverySrv   string
	Endpoint       string
	StunSrv        string
	GenesisAddr    string
	NatFailTimeout time.Duration
	IceFailTimeout time.Duration
}

type EgressOptions struct {
	Addr           string
	Endpoint       string
	ConnectTimeout time.Duration
}
