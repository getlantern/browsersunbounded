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
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return c.DialContext(ctx)
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
		waitForConn: newWaitForConn(),
	}

	go q.maintainQuicConnection()

	return q, nil
}

type quicLayer struct {
	bfconn      *BroflakeConn
	tlsConfig   *tls.Config
	waitForConn *waitForConn
	mx          sync.RWMutex
}

func (c *quicLayer) DialContext(ctx context.Context) (net.Conn, error) {
	c.mx.RLock()
	waiter := c.waitForConn
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

		c.mx.Lock()
		c.waitForConn.set(conn)
		c.mx.Unlock()
		log.Println("QUIC connection established, ready to proxy!")

		// The egress server doesn't actually open streams to us, this is just how we detect a half open
		_, err := conn.AcceptStream(context.Background())
		if err != nil {
			log.Printf("QUIC connection error (%v), closing!\n", err)
			conn.CloseWithError(42069, "")
		}

		// any new connections after this will attempt to wait for re-establishment
		// (up to the context limit) rather than using the closed connection.
		c.mx.Lock()
		c.waitForConn = newWaitForConn()
		c.mx.Unlock()
	}
}

// quicLayer is a ReliableStreamLayer
var _ ReliableStreamLayer = &quicLayer{}

func newWaitForConn() *waitForConn {
	return &waitForConn{
		ready: make(chan struct{}, 0),
	}
}

type waitForConn struct {
	conn  quic.Connection
	ready chan struct{}
}

func (w *waitForConn) get(ctx context.Context) (quic.Connection, error) {
	select {
	case <-w.ready:
		return w.conn, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (w *waitForConn) set(conn quic.Connection) {
	w.conn = conn
	close(w.ready)
}
