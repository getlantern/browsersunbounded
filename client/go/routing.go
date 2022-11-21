// routing.go defines upstream and downstream router components
package main

import (
	"fmt"
	"sync"

	"github.com/getlantern/broflake/common"
)

// A tableRouter is a multiplexer/demultiplexer which functions as the interface to a workerTable,
// abstracting the complexity of connecting a workerTable of arbitrary size to the message bus. An
// upstream tableRouter, in managing a workerTable consisting of workers which handle egress traffic,
// decides how to best utilize those connections (ie, in serial, in parallel, 1:1, multipath, etc.)
type tableRouter interface {
	init()

	onBus(msg ipcMsg)

	onWorker(msg ipcMsg, workerIdx workerID)
}

// A baseRouter implements basic router functionality
type baseRouter struct {
	bus        *ipcChan
	table      *workerTable
	busHook    func(r *baseRouter, msg ipcMsg)
	workerHook func(r *baseRouter, msg ipcMsg, workerIdx workerID)
}

func (r *baseRouter) init(
	listen chan ipcMsg,
	onBus func(msg ipcMsg),
	onWorker func(msg ipcMsg,
		workerIdx workerID),
) {
	for i := range r.table.slot {
		go func(i int) {
			for {
				msg := <-r.table.slot[i].com.tx
				logger.Tracef("baseRouter.init: Msg %+v received from worker with slot %d com.tx\n",
					msg, i)
				onWorker(msg, workerID(i))
			}
		}(i)
	}

	go func() {
		for {
			onBus(<-listen)
		}
	}()
}

func (r *baseRouter) onBus(msg ipcMsg) {
	logger.Tracef("baseRouter.onBus: Msg %s with wid %d received from bus\n",
		msg.ipcType, msg.wid)
	r.busHook(r, msg)
}

func (r *baseRouter) onWorker(msg ipcMsg, workerIdx workerID) {
	r.workerHook(r, msg, workerIdx)
}

// An upstreamRouter parameterizes a baseRouter to send on rx and receive on tx
type upstreamRouter struct {
	baseRouter
}

func (r *upstreamRouter) init() {
	r.baseRouter.init(r.bus.tx, r.onBus, r.onWorker)
}

func (r *upstreamRouter) onBus(msg ipcMsg) {
	r.baseRouter.onBus(msg)
}

func (r *upstreamRouter) onWorker(msg ipcMsg, workerIdx workerID) {
	logger.Tracef("upstreamRouter.onWorker: Msg %s with wid %d received from worker\n",
		msg.ipcType, msg.wid)
	// TODO: a brittle assumption here: upstreamRouter.workerHook will call backRoute and add the
	// wid to the ipcMsg, and it will also forward all appropriate messages to the bus. This is
	// the opposite of downstreamRouter.onWorker, which adds the wid to the ipcMsg and forwards all
	// msgs to the bus. The funkiness here is part of the larger issue concerning the two different
	// ways in which we use the wid field and the asymmetry in how wids are assigned.
	r.baseRouter.onWorker(msg, workerIdx)
}

func (r *upstreamRouter) toBus(msg ipcMsg) {
	logger.Tracef("upstreamRouter.toBus: Msg %s with wid %d sent to bus.rx\n",
		msg.ipcType, msg.wid)
	select {
	case r.bus.rx <- msg:
		// Do nothing, message sent
	default:
		panic("Bus buffer overflow!")
	}
}

func (r *upstreamRouter) toWorker(msg ipcMsg, peerIdx workerID) {
	logger.Tracef("upstreamRouter.toWorker: Msg %s with peerIdx %d sent to worker com.rx\n",
		msg.ipcType, peerIdx)
	select {
	case r.table.slot[peerIdx].com.rx <- msg:
		// Do nothing, message sent
	default:
		// TODO: probably disable this for production? In theory, we might try to route data to
		// a worker who has entered a different state and is no longer listening to their rx
		// channel. When that happens, we'll start filling up their rx buffer. An issue here is
		// that we cannot discern between a worker who has moved on to a different state and a
		// worker who is overwhelmed and can't keep up with the data rate.
		panic(fmt.Sprintf("Upstream router buffer overflow (worker %v)!", peerIdx))
	}
}

// A downstreamRouter parameterizes a baseRouter to send on tx and receive on rx
type downstreamRouter struct {
	baseRouter
}

func (r *downstreamRouter) init() {
	r.baseRouter.init(r.bus.rx, r.onBus, r.onWorker)
}

func (r *downstreamRouter) onBus(msg ipcMsg) {
	r.baseRouter.onBus(msg)
}

func (r *downstreamRouter) onWorker(msg ipcMsg, workerIdx workerID) {
	logger.Tracef("downstreamRouter.onWorker: Msg %s with wid %d received from worker\n",
		msg.ipcType, msg.wid)
	// Add the worker's ID to the msg
	msg.wid = workerIdx
	r.toBus(msg)
	r.baseRouter.onWorker(msg, workerIdx)
}

func (r *downstreamRouter) toBus(msg ipcMsg) {
	logger.Tracef("downstreamRouter.toBus: sending msg %s with wid %d to bus.tx\n",
		msg.ipcType, msg.wid)
	select {
	case r.bus.tx <- msg:
		// Do nothing, message sent
	default:
		panic("Bus buffer overflow!")
	}
}

func (r *downstreamRouter) toWorker(msg ipcMsg) {
	logger.Tracef("downstreamRouter.toWorker: Msg %+v sent to worker with slot %d com.rx\n",
		msg, msg.wid)
	select {
	case r.table.slot[msg.wid].com.rx <- msg:
		// Do nothing, message sent
	default:
		// TODO: probably disable this for production? In theory, we might try to route data to
		// a worker who has entered a different state and is no longer listening to their rx
		// channel. When that happens, we'll start filling up their rx buffer. An issue here is
		// that we cannot discern between a worker who has moved on to a different state and a
		// worker who is overwhelmed and can't keep up with the data rate.
		panic(fmt.Sprintf("Downstream router buffer overflow (worker %v)!", msg.wid))
	}
}

func (r *downstreamRouter) toAllWorkers(msg ipcMsg) {
	for peerIdx := range r.table.slot {
		msg.wid = workerID(peerIdx)
		r.toWorker(msg)
	}
}

// A producerSerialRouter is a tableRouter for managing producer tables. It employs a naive
// "serial failover" routing strategy - that is, given ingress traffic from N consumers, and a
// a choice of M connected producers to route egress traffic through, the producerSerialRouter
// will route all N consumers through a single producer until that producer fails, at which point
// it will reroute all N consumers to the next available producer. This routing strategy is
// certainly inefficient, and it also provides no redundancy or fault recovery wrt end-to-end
// connection state. A producerSerialRouter announces a non-nil path assertion when it has > 0
// connected producers. TODO: We have intentionally ignored the added complexity of evaluating path
// assertions as part of the routing strategy, since we hypothesize that path mismatches (ie,
// traffic destined for an endpoint which a producer cannot reach) will be fixed for free by
// redundantly sending all N consumers' traffic through all M producers in a multipath
// configuration. The multipath router to provide this functionality is forthcoming after the MVP.
// Despite its obvious inefficiencies, we hypothesize that the producerSerialRouter should work
// fine for the MVP, since desktop peers do not share their connectivity - ie, any peer that
// implements this producerSerialRouter won't even have multiple consumers to route for!
type producerSerialRouter struct {
	upstreamRouter
	producerPA  map[workerID]common.PathAssertion
	forwardIdx  map[workerID]workerID   // consumer:producer
	invertedIdx map[workerID][]workerID // producer:consumers
	sync.RWMutex
}

func newProducerSerialRouter(bus *ipcChan, table *workerTable, cTableSize int) *producerSerialRouter {
	psr := producerSerialRouter{
		upstreamRouter: upstreamRouter{
			baseRouter: baseRouter{
				bus:   bus,
				table: table,
			},
		},
		producerPA:  make(map[workerID]common.PathAssertion),
		forwardIdx:  make(map[workerID]workerID),
		invertedIdx: make(map[workerID][]workerID),
	}

	psr.upstreamRouter.baseRouter.busHook = psr.busHook
	psr.upstreamRouter.baseRouter.workerHook = psr.workerHook

	for i := 0; i < table.size; i++ {
		psr.producerPA[workerID(i)] = common.PathAssertion{}
		psr.invertedIdx[workerID(i)] = []workerID{}
	}

	for i := 0; i < cTableSize; i++ {
		psr.forwardIdx[workerID(i)] = NoRoute
	}

	return &psr
}

func (r *producerSerialRouter) onPathAssertion(pa common.PathAssertion, workerIdx workerID) {
	logger.Tracef("producerSerialRouter:onPathAssertion: onPathAssertion %+v with worker %d\n",
		pa, workerIdx)
	r.Lock()
	defer r.Unlock()
	r.producerPA[workerIdx] = pa

	if !pa.Nil() {
		// Case 1: We've got a new connected producer, so let's route any unrouted consumers to them
		for consumer, producer := range r.forwardIdx {
			if producer == NoRoute {
				r.forwardIdx[consumer] = workerIdx
				r.invertedIdx[workerIdx] = append(r.invertedIdx[workerIdx], consumer)
			}
		}
	} else {
		// Case 2: A producer has died, so reroute their consumers to a random new producer if available
		newProducer := NoRoute
		for producer, pa := range r.producerPA {
			if !pa.Nil() {
				newProducer = producer
			}
		}

		for _, consumer := range r.invertedIdx[workerIdx] {
			r.forwardIdx[consumer] = newProducer
			if newProducer != NoRoute {
				r.invertedIdx[newProducer] = append(r.invertedIdx[newProducer], consumer)
			}
		}

		r.invertedIdx[workerIdx] = []workerID{}
	}
}

func (r *producerSerialRouter) route(wid workerID) (bool, workerID) {
	r.RLock()
	defer r.RUnlock()
	route := r.forwardIdx[wid]
	return route != NoRoute, route
}

func (r *producerSerialRouter) backRoute(wid workerID) (bool, workerID) {
	r.RLock()
	defer r.RUnlock()
	consumers := r.invertedIdx[wid]

	if len(consumers) == 0 {
		return false, NoRoute
	}

	// TODO: this line is the hack that enables us to route packets without a real mux/demux protocol
	// during the MVP phase. Why this works: the producerSerialRouter is only used in the MVP-phase
	// desktop client, and during MVP phase it's only used in conjunction with a consumerRouter that
	// manages a table consisting of exactly 1 worker (the producerUserStream). Since a
	// producerSerialRouter maps many consumers to a single producer, it would be impossible to
	// round trip a packet from producer -> consumer without piggybacking some kind of consumer ID
	// information on the packet. But since we know we only have a single consumer right now, we can
	// just route all returning streams to him. That solves demux in the client, but we also rely on
	// two other constraints to make this work: during MVP phase, there is no multi-hop routing (and
	// thus no downstream multiplexing), and the "free" peers on our network implement a
	// producerPoolRouter which guarantees a 1:1 mapping between WebRTC datachannel and WebSocket
	// connection to the egress server
	return true, consumers[0]
}

func (psr *producerSerialRouter) busHook(r *baseRouter, msg ipcMsg) {
	switch msg.ipcType {
	case ChunkIPC:
		ok, route := psr.route(msg.wid)
		if ok {
			psr.toWorker(msg, route)
		}
	}
}

func (psr *producerSerialRouter) workerHook(r *baseRouter, msg ipcMsg, workerIdx workerID) {
	logger.Tracef("producerSerialRouter:workerHook: Msg %s from worker %d seen\n",
		msg.ipcType, workerIdx)
	switch msg.ipcType {
	case PathAssertionIPC:
		psr.onPathAssertion(msg.data.(common.PathAssertion), workerIdx)
	case ChunkIPC:
		ok, route := psr.backRoute(workerIdx)
		if ok {
			msg.wid = route
			psr.toBus(msg)
		}
	}
}

// A producerPoolRouter is a tableRouter for managing producer tables which employs the most
// naive routing strategy available: it maintains a persistent pool of pre-connected producers,
// routing each consumer through its own producer in a 1:1 mapping. A producerPoolRouter only
// announces a non-nil path assertion when all of its producer workerFSMs have established stable
// connections. For these reasons, a producerPoolRouter is only useful for managing connections to
// producers which are under Lantern's control - eg, WebSocket connections to an egress server.
// Using a producerPoolRouter to manage a producer table with N slots in a client which has M
// consumer slots (where N != M) will result in undefined behavior.
type producerPoolRouter struct {
	upstreamRouter
	producerPA map[workerID]common.PathAssertion
	sync.RWMutex
}

func newProducerPoolRouter(bus *ipcChan, table *workerTable) *producerPoolRouter {
	ppr := producerPoolRouter{
		upstreamRouter: upstreamRouter{
			baseRouter: baseRouter{
				bus:   bus,
				table: table,
			},
		},
		producerPA: make(map[workerID]common.PathAssertion),
	}

	ppr.upstreamRouter.baseRouter.busHook = ppr.busHook
	ppr.upstreamRouter.baseRouter.workerHook = ppr.workerHook

	return &ppr
}

func (r *producerPoolRouter) onPathAssertion(pa common.PathAssertion, workerIdx workerID) {
	r.Lock()
	defer r.Unlock()
	r.producerPA[workerIdx] = pa
}

func (r *producerPoolRouter) globalPathAssertion() common.PathAssertion {
	r.RLock()
	defer r.RUnlock()

	// If all producer path assertions are non-nil, the global path assertion is their set
	// intersection; otherwise, it's nil

	allNonNil := true
	for _, pa := range r.producerPA {
		if pa.Nil() {
			allNonNil = false
			break
		}
	}

	// TODO: actually implement the intersection function in the common module, don't hardcode
	// (*, 1) after the MVP!
	if allNonNil {
		return common.PathAssertion{Allow: []common.Endpoint{{Host: "*", Distance: 1}}}
	}

	return common.PathAssertion{}
}

func (r *producerPoolRouter) route(wid workerID) (bool, workerID) {
	return true, wid
}

// For producerPoolRouter, the route function is the identity function, so it works backwards
func (r *producerPoolRouter) backRoute(wid workerID) (bool, workerID) {
	return r.route(wid)
}

func (ppr *producerPoolRouter) busHook(r *baseRouter, msg ipcMsg) {
	logger.Tracef("producerPoolRouter:busHook: Msg %s from bus seen\n", msg.ipcType)
	switch msg.ipcType {
	case ConnectivityCheckIPC:
		logger.Tracef("producerPoolRouter.busHook: sending broadcast PathAssertionIPC to worker %d\n", msg.wid)
		ppr.toBus(ipcMsg{ipcType: PathAssertionIPC, data: ppr.globalPathAssertion(), wid: msg.wid})
	case ChunkIPC:
		// TODO: is this necessary?
		if ppr.globalPathAssertion().Nil() {
			return
		}
		_, route := ppr.route(msg.wid)
		ppr.toWorker(msg, route)
	}
}

func (ppr *producerPoolRouter) workerHook(r *baseRouter, msg ipcMsg, workerIdx workerID) {
	switch msg.ipcType {
	case PathAssertionIPC:
		logger.Tracef("producerPoolRouter.workerHook: sending broadcast PathAssertionIPC to all workers\n")
		ppr.onPathAssertion(msg.data.(common.PathAssertion), workerIdx)
		pa := ppr.globalPathAssertion()
		// TODO: currently we send a new path assertion IPC every time we receive a new path
		// assertion from a worker. In practice this is harmless, since our workers are egress
		// consumers who are likely to send just a single path assertion per session. But an optimal
		// implementation would cache the last PA and only send a new IPC when there's a delta.
		ppr.toBus(ipcMsg{ipcType: PathAssertionIPC, data: pa, wid: BroadcastRoute})
	case ChunkIPC:
		// Backrouting! TODO: the asymmetry in how upstream and downstream routers determine and
		// assign and interpret the wid is a source of much confusion and must be fixed
		_, route := ppr.backRoute(workerIdx)
		msg.wid = route
		ppr.toBus(msg)
	}
}

// A consumerRouter is the standard downstream tableRouter. Since workers in the downstream
// router(s) handle ingress traffic, the consumerRouter just muxes and demuxes to/from the bus
// without implementing any fancy routing logic
type consumerRouter struct {
	downstreamRouter
}

func newConsumerRouter(bus *ipcChan, table *workerTable) *consumerRouter {
	cr := consumerRouter{
		downstreamRouter: downstreamRouter{
			baseRouter: baseRouter{
				bus:   bus,
				table: table,
			},
		},
	}

	cr.downstreamRouter.baseRouter.busHook = cr.busHook
	cr.downstreamRouter.baseRouter.workerHook = cr.workerHook

	return &cr
}

func (cr *consumerRouter) busHook(r *baseRouter, msg ipcMsg) {
	// TODO: we currently forward all msg types without any filter... maybe it's worth revisiting
	switch msg.wid {
	case BroadcastRoute:
		logger.Tracef("consumerRouter.busHook: sending broadcast msg %+v to all workers\n",
			msg)
		cr.toAllWorkers(msg)
	default:
		logger.Tracef("consumerRouter.busHook: sending msg %+v to single worker\n",
			msg)
		cr.toWorker(msg)
	}
}

func (cr *consumerRouter) workerHook(r *baseRouter, msg ipcMsg, workerIdx workerID) {
	logger.Tracef("consumerRouter:workerHook: Msg %s from worker %d seen\n",
		msg.ipcType, workerIdx)
	// Do nothing
}

// workerTable ts the structure we use to represent the producer and consumer tables
type workerTable struct {
	size int
	slot []workerFSM
}

// Construct a new workerTable; len(list) corresponds to max concurrent connections for this table.
// By mixing workerFSMs, you can construct a table consisting of connections over different transports.
func newWorkerTable(list []workerFSM) *workerTable {
	pt := workerTable{slot: list, size: len(list)}
	return &pt
}

// Start all of this table's workers
func (t workerTable) start() {
	for i := range t.slot {
		t.slot[i].start()
	}
}

// Stop all of this table's workers
func (t workerTable) stop() {
	for i := range t.slot {
		t.slot[i].stop()
	}
}
