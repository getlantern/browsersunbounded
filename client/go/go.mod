module github.com/getlantern/broflake/client

go 1.18

require github.com/getlantern/broflake/common v0.0.0-00010101000000-000000000000

require (
	github.com/anacrolix/envpprof v1.2.1
	github.com/elazarl/goproxy v0.0.0-20221015165544-a0805db90819
	github.com/getlantern/broflake/clientcore v0.0.0-00010101000000-000000000000
	github.com/lucas-clemente/quic-go v0.31.1
)

require (
	github.com/anacrolix/log v0.13.1 // indirect
	github.com/go-task/slim-sprig v0.0.0-20210107165309-348f09dbbbc0 // indirect
	github.com/golang/mock v1.6.0 // indirect
	github.com/google/pprof v0.0.0-20210407192527-94a9f03dee38 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/klauspost/compress v1.10.3 // indirect
	github.com/marten-seemann/qtls-go1-18 v0.1.3 // indirect
	github.com/marten-seemann/qtls-go1-19 v0.1.1 // indirect
	github.com/onsi/ginkgo/v2 v2.2.0 // indirect
	github.com/pion/datachannel v1.5.5 // indirect
	github.com/pion/dtls/v2 v2.1.5 // indirect
	github.com/pion/ice/v2 v2.2.12 // indirect
	github.com/pion/interceptor v0.1.11 // indirect
	github.com/pion/logging v0.2.2 // indirect
	github.com/pion/mdns v0.0.5 // indirect
	github.com/pion/randutil v0.1.0 // indirect
	github.com/pion/rtcp v1.2.10 // indirect
	github.com/pion/rtp v1.7.13 // indirect
	github.com/pion/sctp v1.8.5 // indirect
	github.com/pion/sdp/v3 v3.0.6 // indirect
	github.com/pion/srtp/v2 v2.0.10 // indirect
	github.com/pion/stun v0.3.5 // indirect
	github.com/pion/transport v0.14.1 // indirect
	github.com/pion/turn/v2 v2.0.8 // indirect
	github.com/pion/udp v0.1.1 // indirect
	github.com/pion/webrtc/v3 v3.1.50 // indirect
	golang.org/x/crypto v0.0.0-20221010152910-d6f0a8c073c2 // indirect
	golang.org/x/exp v0.0.0-20220722155223-a9213eeb770e // indirect
	golang.org/x/mod v0.6.0-dev.0.20220419223038-86c51ed26bb4 // indirect
	golang.org/x/net v0.3.0 // indirect
	golang.org/x/sys v0.3.0 // indirect
	golang.org/x/tools v0.1.12 // indirect
	nhooyr.io/websocket v1.8.7 // indirect
)

replace github.com/getlantern/broflake/common => ../../common

replace github.com/getlantern/broflake/clientcore => ../../clientcore
