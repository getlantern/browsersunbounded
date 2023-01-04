package clientcore

import (
	"time"
)

type WebRTCOptions struct {
	DiscoverySrv   string
	Endpoint       string
	GenesisAddr    string
	NATFailTimeout time.Duration
	ICEFailTimeout time.Duration
	STUNBatch      func(size uint32) (batch []string, err error)
	STUNBatchSize  uint32
}

type EgressOptions struct {
	Addr           string
	Endpoint       string
	ConnectTimeout time.Duration
}
