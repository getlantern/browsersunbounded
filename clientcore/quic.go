package clientcore

import (
	"context"
	"crypto/tls"
	"crypto/x509"
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
	CA                 *x509.CertPool
}

func NewQUICLayer(bfconn *BroflakeConn, qopt *QUICLayerOptions) (*QUICLayer, error) {
	q := &QUICLayer{
		bfconn: bfconn,
		tlsConfig: &tls.Config{
			ServerName:         qopt.ServerName,
			InsecureSkipVerify: qopt.InsecureSkipVerify,
			NextProtos:         []string{"broflake"},
			RootCAs:            qopt.CA,
		},
		eventualConn: newEventualConn(),
	}

	return q, nil
}

type QUICLayer struct {
	bfconn       *BroflakeConn
	tlsConfig    *tls.Config
	eventualConn *eventualConn
	mx           sync.RWMutex
	ctx          context.Context
	cancel       context.CancelFunc
}

// DialAndMaintainQUICConnection attempts to create and maintain an e2e QUIC connection by dialing
// the other end, detecting if that connection breaks, and redialing. Forever.
func (c *QUICLayer) DialAndMaintainQUICConnection() {
	c.ctx, c.cancel = context.WithCancel(context.Background())

	go func() {
		for {
			var conn quic.Connection

			// State 1 of 2: Keep dialing until we acquire a connection
			for {
				select {
				case <-c.ctx.Done():
					log.Printf("Cancelling QUIC dialer!\n")
					return
				default:
					// Do nothing
				}

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

			// State 2 of 2: Connection established, block until we detect a half open or a context cancellation
			_, err := conn.AcceptStream(c.ctx)
			if err != nil {
				log.Printf("QUIC connection error (%v), closing!\n", err)
				conn.CloseWithError(42069, "")
			}

			// If we've hit this path, either our QUIC connection has broken or the caller wants to
			// destroy this QUICLayer, so we iterate the loop to proceed. If there's a process that's
			// using this QUICLayer for communication, they'll block on their next call to DialContext
			// until a new QUIC connection is acquired (or their context deadline expires).
			c.mx.Lock()
			c.eventualConn = newEventualConn()
			c.mx.Unlock()
		}
	}()
}

// Close a QUICLayer which was previously opened via a call to DialAndMaintainQUICConnection.
func (c *QUICLayer) Close() {
	if c.cancel != nil {
		c.cancel()
	}
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
