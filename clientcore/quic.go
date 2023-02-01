package clientcore

import (
	"context"
	"crypto/tls"
	"log"
	"net"
	"net/http"
	"net/url"
	"sync"

	"github.com/getlantern/broflake/common"
	"github.com/lucas-clemente/quic-go"
)

type ReliableStreamLayer interface {
	DialContext(ctx context.Context) (net.Conn, error)
}

func CreateHTTPTransport(c ReliableStreamLayer) *http.Transport {
	return &http.Transport{
		Proxy: func(req *http.Request) (*url.URL, error) {
			return url.Parse("http://i.do.nothing")
		},
		Dial: func(network, addr string) (net.Conn, error) {
			return c.DialContext(context.Background())
		},
	}
}

type QUICOptions struct {
	ServerName         string
	InsecureSkipVerify bool
}

// Maintains an end to end quic connection with egress server over a BroflakeConn
func NewQUICLayer(bfconn *BroflakeConn, qopt *QUICOptions) (*quicLayer, error) {
	q := &quicLayer{
		bfconn: bfconn,
		tlsConfig: &tls.Config{
			ServerName:         qopt.ServerName,
			InsecureSkipVerify: qopt.InsecureSkipVerify,
			NextProtos:         []string{"broflake"},
		},
	}

	go q.maintainQuicConnection()

	return q, nil
}

type quicLayer struct {
	bfconn    *BroflakeConn
	tlsConfig *tls.Config
	qconn     quic.Connection
	mx        sync.RWMutex
}

func (c *quicLayer) DialContext(ctx context.Context) (net.Conn, error) {
	c.mx.RLock()
	defer c.mx.RUnlock()
	stream, err := c.qconn.OpenStreamSync(ctx)
	return common.QUICStreamNetConn{Stream: stream}, err
}

func (c *quicLayer) setConn(conn quic.Connection) {
	c.mx.Lock()
	defer c.mx.Unlock()
	c.qconn = conn
}

func (c *quicLayer) maintainQuicConnection() {
	for {
		var conn quic.Connection

		// Keep dialing until we establish a connection with the egress server
		for {
			var err error
			conn, err = quic.Dial(c.bfconn, common.DebugAddr("NELSON WUZ HERE"), "DEBUG", c.tlsConfig, &common.QUICCfg)
			if err != nil {
				log.Printf("QUIC dial failed (%v), retrying...\n", err)
				continue
			}
			break
		}

		log.Println("QUIC connection established, ready to proxy!")
		c.setConn(conn)

		// The egress server doesn't actually open streams to us, this is just how we detect a half open
		_, err := conn.AcceptStream(context.Background())
		if err != nil {
			log.Printf("QUIC connection error (%v), closing!\n", err)
			conn.CloseWithError(42069, "")
		}
	}
}

// quicLayer is a ReliableStreamLayer
var _ ReliableStreamLayer = &quicLayer{}
