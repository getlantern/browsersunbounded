module github.com/getlantern/broflake/client

go 1.18

require (
	github.com/elazarl/goproxy v0.0.0-20221015165544-a0805db90819
	github.com/getlantern/broflake/common v0.0.0-00010101000000-000000000000
	github.com/getlantern/golog v0.0.0-20221014032422-49749a7176cf
	github.com/pion/webrtc/v3 v3.1.48
	github.com/xtaci/smux v1.5.16
	nhooyr.io/websocket v1.8.7
)

require (
	github.com/getlantern/context v0.0.0-20190109183933-c447772a6520 // indirect
	github.com/getlantern/errors v1.0.1 // indirect
	github.com/getlantern/hex v0.0.0-20190417191902-c6586a6fe0b7 // indirect
	github.com/getlantern/hidden v0.0.0-20190325191715-f02dbb02be55 // indirect
	github.com/getlantern/ops v0.0.0-20190325191751-d70cb0d6f85f // indirect
	github.com/go-stack/stack v1.8.0 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/klauspost/compress v1.10.3 // indirect
	github.com/oxtoacart/bpool v0.0.0-20190530202638-03653db5a59c // indirect
	github.com/pion/datachannel v1.5.2 // indirect
	github.com/pion/dtls/v2 v2.1.5 // indirect
	github.com/pion/ice/v2 v2.2.11 // indirect
	github.com/pion/interceptor v0.1.11 // indirect
	github.com/pion/logging v0.2.2 // indirect
	github.com/pion/mdns v0.0.5 // indirect
	github.com/pion/randutil v0.1.0 // indirect
	github.com/pion/rtcp v1.2.10 // indirect
	github.com/pion/rtp v1.7.13 // indirect
	github.com/pion/sctp v1.8.3 // indirect
	github.com/pion/sdp/v3 v3.0.6 // indirect
	github.com/pion/srtp/v2 v2.0.10 // indirect
	github.com/pion/stun v0.3.5 // indirect
	github.com/pion/transport v0.13.1 // indirect
	github.com/pion/turn/v2 v2.0.8 // indirect
	github.com/pion/udp v0.1.1 // indirect
	go.uber.org/atomic v1.7.0 // indirect
	go.uber.org/multierr v1.6.0 // indirect
	go.uber.org/zap v1.19.1 // indirect
	golang.org/x/crypto v0.0.0-20221010152910-d6f0a8c073c2 // indirect
	golang.org/x/net v0.1.0 // indirect
	golang.org/x/sys v0.1.0 // indirect
)

replace github.com/getlantern/broflake/common => ../../common
