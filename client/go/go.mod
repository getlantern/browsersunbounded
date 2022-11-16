module github.com/getlantern/broflake/client

go 1.18

require (
	github.com/elazarl/goproxy v0.0.0-20221015165544-a0805db90819
	github.com/getlantern/broflake/common v0.0.0-00010101000000-000000000000
	// TODO 2022-11-16 <soltzen>: Flashlight is only required here to enable
	// domain-fronting. Broflake will be included **inside** flashlight at one
	// point, and when that happens, we can remove this dependency. Same goes for
	// "getlantern/fronted"
	github.com/getlantern/flashlight v0.0.0-20221115121006-085f0881c4b1
	github.com/getlantern/fronted v0.0.0-20221102104652-893705395782
	github.com/pion/webrtc/v3 v3.1.46
	github.com/xtaci/smux v1.5.16
	gopkg.in/yaml.v3 v3.0.1
	nhooyr.io/websocket v1.8.7
)

require (
	crawshaw.io/sqlite v0.3.3-0.20210127221821-98b1f83c5508 // indirect
	github.com/RoaringBitmap/roaring v1.2.1 // indirect
	github.com/ajwerner/btree v0.0.0-20211221152037-f427b3e689c0 // indirect
	github.com/alecthomas/atomic v0.1.0-alpha2 // indirect
	github.com/anacrolix/chansync v0.3.0 // indirect
	github.com/anacrolix/dht/v2 v2.19.1 // indirect
	github.com/anacrolix/envpprof v1.2.1 // indirect
	github.com/anacrolix/generics v0.0.0-20220618083756-f99e35403a60 // indirect
	github.com/anacrolix/go-libutp v1.2.0 // indirect
	github.com/anacrolix/log v0.13.2-0.20220711050817-613cb738ef30 // indirect
	github.com/anacrolix/missinggo v1.3.0 // indirect
	github.com/anacrolix/missinggo/perf v1.0.0 // indirect
	github.com/anacrolix/missinggo/v2 v2.7.0 // indirect
	github.com/anacrolix/mmsg v1.0.0 // indirect
	github.com/anacrolix/multiless v0.3.0 // indirect
	github.com/anacrolix/publicip v0.2.0 // indirect
	github.com/anacrolix/squirrel v0.4.1-0.20220122230132-14b040773bac // indirect
	github.com/anacrolix/stm v0.4.0 // indirect
	github.com/anacrolix/sync v0.4.0 // indirect
	github.com/anacrolix/torrent v1.47.0 // indirect
	github.com/anacrolix/upnp v0.1.3-0.20220123035249-922794e51c96 // indirect
	github.com/anacrolix/utp v0.1.0 // indirect
	github.com/andybalholm/brotli v1.0.4 // indirect
	github.com/armon/go-radix v1.0.0 // indirect
	github.com/bahlo/generic-list-go v0.2.0 // indirect
	github.com/benbjohnson/immutable v0.3.0 // indirect
	github.com/bits-and-blooms/bitset v1.2.2 // indirect
	github.com/blang/semver v3.5.1+incompatible // indirect
	github.com/bradfitz/iter v0.0.0-20191230175014-e8f45d346db8 // indirect
	github.com/cenkalti/backoff/v4 v4.1.3 // indirect
	github.com/cheekybits/genny v1.0.0 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/dustin/go-humanize v1.0.0 // indirect
	github.com/edsrzf/mmap-go v1.1.0 // indirect
	github.com/fsnotify/fsnotify v1.5.4 // indirect
	github.com/getlantern/borda v0.0.0-20220308134056-c4a5602f778e // indirect
	github.com/getlantern/byteexec v0.0.0-20200509011419-2f5ed5531ada // indirect
	github.com/getlantern/common v1.2.0 // indirect
	github.com/getlantern/context v0.0.0-20220418194847-3d5e7a086201 // indirect
	github.com/getlantern/detour v0.0.0-20200814023224-28e20f4ac2d1 // indirect
	github.com/getlantern/dhtup v0.0.0-20220627142103-ed614929df34 // indirect
	github.com/getlantern/domains v0.0.0-20220311111720-94f59a903271 // indirect
	github.com/getlantern/elevate v0.0.0-20210901195629-ce58359e4d0e // indirect
	github.com/getlantern/errors v1.0.3 // indirect
	github.com/getlantern/eventual v1.0.0 // indirect
	github.com/getlantern/eventual/v2 v2.0.2 // indirect
	github.com/getlantern/filepersist v0.0.0-20210901195658-ed29a1cb0b7c // indirect
	github.com/getlantern/geolookup v0.0.0-20210901195705-eec711834596 // indirect
	github.com/getlantern/golog v0.0.0-20211223150227-d4d95a44d873 // indirect
	github.com/getlantern/hex v0.0.0-20220104173244-ad7e4b9194dc // indirect
	github.com/getlantern/hidden v0.0.0-20220104173330-f221c5a24770 // indirect
	github.com/getlantern/idletiming v0.0.0-20201229174729-33d04d220c4e // indirect
	github.com/getlantern/iptool v0.0.0-20210901195942-5e13a4786de9 // indirect
	github.com/getlantern/jibber_jabber v0.0.0-20210901195950-68955124cc42 // indirect
	github.com/getlantern/keyman v0.0.0-20210622061955-aa0d47d4932c // indirect
	github.com/getlantern/libp2p v0.0.0-20220913092210-f9e794d6b10d // indirect
	github.com/getlantern/msgpack v3.1.4+incompatible // indirect
	github.com/getlantern/mtime v0.0.0-20200417132445-23682092d1f7 // indirect
	github.com/getlantern/netx v0.0.0-20211206143627-7ccfeb739cbd // indirect
	github.com/getlantern/ops v0.0.0-20220713155959-1315d978fff7 // indirect
	github.com/getlantern/osversion v0.0.0-20190510010111-432ecec19031 // indirect
	github.com/getlantern/quicproxy v0.0.0-20220808081037-32e9be8ec447 // indirect
	github.com/getlantern/rot13 v0.0.0-20210901200056-01bce62cb8bb // indirect
	github.com/getlantern/timezone v0.0.0-20210901200113-3f9de9d360c9 // indirect
	github.com/getlantern/tlsdialer/v3 v3.0.3 // indirect
	github.com/getlantern/upnp v0.0.0-20220531140457-71a975af1fad // indirect
	github.com/getlantern/yaml v0.0.0-20190801163808-0c9bb1ebf426 // indirect
	github.com/getsentry/sentry-go v0.13.0 // indirect
	github.com/go-logr/logr v1.2.3 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-stack/stack v1.8.1 // indirect
	github.com/go-task/slim-sprig v0.0.0-20210107165309-348f09dbbbc0 // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/google/btree v1.1.2 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/gorilla/mux v1.8.0 // indirect
	github.com/gorilla/websocket v1.5.0 // indirect
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.10.1 // indirect
	github.com/huandu/xstrings v1.3.2 // indirect
	github.com/huin/goupnp v1.0.3 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/compress v1.15.7 // indirect
	github.com/lispad/go-generics-tools v1.1.0 // indirect
	github.com/lucas-clemente/quic-go v0.27.1 // indirect
	github.com/marten-seemann/qtls-go1-16 v0.1.5 // indirect
	github.com/marten-seemann/qtls-go1-17 v0.1.1 // indirect
	github.com/marten-seemann/qtls-go1-18 v0.1.1 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/mschoch/smat v0.2.0 // indirect
	github.com/nxadm/tail v1.4.8 // indirect
	github.com/onsi/ginkgo v1.16.5 // indirect
	github.com/oxtoacart/bpool v0.0.0-20190530202638-03653db5a59c // indirect
	github.com/pion/datachannel v1.5.2 // indirect
	github.com/pion/dtls/v2 v2.1.5 // indirect
	github.com/pion/ice/v2 v2.2.10 // indirect
	github.com/pion/interceptor v0.1.11 // indirect
	github.com/pion/logging v0.2.2 // indirect
	github.com/pion/mdns v0.0.5 // indirect
	github.com/pion/randutil v0.1.0 // indirect
	github.com/pion/rtcp v1.2.10 // indirect
	github.com/pion/rtp v1.7.13 // indirect
	github.com/pion/sctp v1.8.2 // indirect
	github.com/pion/sdp/v3 v3.0.6 // indirect
	github.com/pion/srtp/v2 v2.0.10 // indirect
	github.com/pion/stun v0.3.5 // indirect
	github.com/pion/transport v0.13.1 // indirect
	github.com/pion/turn/v2 v2.0.8 // indirect
	github.com/pion/udp v0.1.1 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/refraction-networking/utls v1.0.0 // indirect
	github.com/rs/dnscache v0.0.0-20211102005908-e0241e321417 // indirect
	github.com/stretchr/testify v1.8.0 // indirect
	github.com/tidwall/btree v1.3.1 // indirect
	github.com/tkuchiki/go-timezone v0.2.0 // indirect
	go.etcd.io/bbolt v1.3.6 // indirect
	go.opentelemetry.io/otel v1.9.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/internal/retry v1.8.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.8.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.7.0 // indirect
	go.opentelemetry.io/otel/sdk v1.8.0 // indirect
	go.opentelemetry.io/otel/trace v1.9.0 // indirect
	go.opentelemetry.io/proto/otlp v0.18.0 // indirect
	go.uber.org/atomic v1.9.0 // indirect
	go.uber.org/multierr v1.6.0 // indirect
	go.uber.org/zap v1.19.1 // indirect
	golang.org/x/crypto v0.0.0-20220926161630-eccd6366d1be // indirect
	golang.org/x/exp v0.0.0-20220613132600-b0d781184e0d // indirect
	golang.org/x/mod v0.6.0-dev.0.20220106191415-9b9b3d81d5e3 // indirect
	golang.org/x/net v0.0.0-20220927171203-f486391704dc // indirect
	golang.org/x/sync v0.0.0-20220601150217-0de741cfad7f // indirect
	golang.org/x/sys v0.0.0-20220928140112-f11e5e49a4ec // indirect
	golang.org/x/text v0.3.8-0.20211105212822-18b340fc7af2 // indirect
	golang.org/x/time v0.0.0-20220609170525-579cf78fd858 // indirect
	golang.org/x/tools v0.1.10 // indirect
	golang.org/x/xerrors v0.0.0-20220609144429-65e65417b02f // indirect
	google.golang.org/appengine v1.6.7 // indirect
	google.golang.org/genproto v0.0.0-20220630174209-ad1d48641aa7 // indirect
	google.golang.org/grpc v1.47.0 // indirect
	google.golang.org/protobuf v1.28.0 // indirect
	gopkg.in/tomb.v1 v1.0.0-20141024135613-dd632973f1e7 // indirect
	howett.net/plist v0.0.0-20200419221736-3b63eb3a43b5 // indirect
)

replace github.com/getlantern/broflake/common => ../../common

// Required for flashlight to work
replace github.com/elazarl/goproxy => github.com/getlantern/goproxy v0.0.0-20220805074304-4a43a9ed4ec6

// Required for flashlight to work
replace github.com/lucas-clemente/quic-go => github.com/getlantern/quic-go v0.27.1-0.20220428155905-cb005872fecc

// Required for flashlight to work
replace github.com/refraction-networking/utls => github.com/getlantern/utls v0.0.0-20221011213556-17014cb6fc4a

// replace github.com/keighl/mandrill => github.com/getlantern/mandrill v0.0.0-20221004112352-e7c04248adcb
