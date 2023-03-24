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
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return c.DialContext(ctx)
		},
	}
}

type QUICLayerOptions struct {
	ServerName         string
	InsecureSkipVerify bool
}

// Maintains an end to end quic connection with egress server over a BroflakeConn
func NewQUICLayer(bfconn *BroflakeConn, qopt *QUICLayerOptions) (*QUICLayer, error) {
	q := &QUICLayer{
		bfconn: bfconn,
		tlsConfig: &tls.Config{
			ServerName:         qopt.ServerName,
			InsecureSkipVerify: qopt.InsecureSkipVerify,
			NextProtos:         []string{"broflake"},
		},
		eventualConn: newEventualConn(),
	}

	go q.maintainQUICConnection()

	return q, nil
}

type QUICLayer struct {
	bfconn       *BroflakeConn
	tlsConfig    *tls.Config
	eventualConn *eventualConn
	mx           sync.RWMutex
}

func (c *QUICLayer) DialContext(ctx context.Context) (net.Conn, error) {
	c.mx.RLock()
	waiter := c.eventualConn
	c.mx.RUnlock()

	qconn, err := waiter.get(ctx)
	if err != nil {
		return nil, err
	}
	stream, err := qconn.OpenStreamSync(ctx)
	if err != nil {
		return nil, err
	}
	return common.QUICStreamNetConn{Stream: stream}, nil
}

func (c *QUICLayer) maintainQUICConnection() {
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

		c.mx.Lock()
		c.eventualConn.set(conn)
		c.mx.Unlock()
		log.Println("QUIC connection established, ready to proxy!")

		// The egress server doesn't actually open streams to us, this is just how we detect a half open
		_, err := conn.AcceptStream(context.Background())
		if err != nil {
			log.Printf("QUIC connection error (%v), closing!\n", err)
			conn.CloseWithError(42069, "")
		}

		// If we've hit this path, our QUIC connection has terminated, so we start trying to
		// acquire a new one. If there's a process that's using this QUICLayer for communication,
		// they'll block on their next call to DialContext until a new QUIC connection is acquired.
		c.mx.Lock()
		c.eventualConn = newEventualConn()
		c.mx.Unlock()
	}
}

// QUICLayer is a ReliableStreamLayer
var _ ReliableStreamLayer = &QUICLayer{}

func newEventualConn() *eventualConn {
	return &eventualConn{
		ready: make(chan struct{}, 0),
	}
}

type eventualConn struct {
	conn  quic.Connection
	ready chan struct{}
}

func (w *eventualConn) get(ctx context.Context) (quic.Connection, error) {
	select {
	case <-w.ready:
		return w.conn, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (w *eventualConn) set(conn quic.Connection) {
	w.conn = conn
	close(w.ready)
}
