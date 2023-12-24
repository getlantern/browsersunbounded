package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/netip"
	"sync"
	"time"

	"github.com/getlantern/broflake/common"
	netstatecl "github.com/getlantern/broflake/netstate/client"
)

type vertexLabel string

type vertex struct {
	edges    []edge
	lastSeen time.Time
}

// Parallel edges possess the same label but must have different IDs
// don't create multiple edges of vertex v with the same ID!
type edge struct {
	label vertexLabel
	id    string
}

// multigraph is a threadsafe multigraph represented as an adjacency list. It's an identity bearing
// multigraph (parallel edges between vertices possess distinct identities)
type multigraph struct {
	data map[vertexLabel]vertex
	sync.RWMutex
}

func newMultigraph() *multigraph {
	return &multigraph{data: make(map[vertexLabel]vertex)}
}

// Idempotently add a vertex and update its lastSeen time
func (g *multigraph) addVertex(v vertexLabel) {
	g.Lock()
	defer g.Unlock()

	if _, ok := g.data[v]; !ok {
		g.data[v] = vertex{}
	}

	vv := g.data[v]
	vv.lastSeen = time.Now()
	g.data[v] = vv
}

// Idempotently delete a vertex
func (g *multigraph) delVertex(v vertexLabel) {
	g.Lock()
	defer g.Unlock()
	delete(g.data, v)
}

// Get the degree of vertex v, returns 0 if v does not exist
func (g *multigraph) degree(v vertexLabel) int {
	g.RLock()
	defer g.RUnlock()
	return len(g.data[v].edges)
}

// Add an edge e to vertex v, if v does not exist it will be created
func (g *multigraph) addEdge(v vertexLabel, e edge) {
	g.addVertex(v)
	g.Lock()
	defer g.Unlock()

	vv := g.data[v]
	vv.edges = append(vv.edges, e)
	g.data[v] = vv
}

// Delete a single instance of a potentially parallel edge of vertex v by ID
func (g *multigraph) delEdge(v vertexLabel, id string) {
	g.Lock()
	defer g.Unlock()

	if _, ok := g.data[v]; !ok {
		return
	}

	for i, ee := range g.data[v].edges {
		if ee.id == id {
			g.data[v].edges[i] = g.data[v].edges[len(g.data[v].edges)-1]

			vv := g.data[v]
			vv.edges = vv.edges[:len(g.data[v].edges)-1]
			g.data[v] = vv
			return
		}
	}
}

// Encode this multigraph as a Graphviz graph using the 'neato' layout
func (g *multigraph) toGraphvizNeato() string {
	gv := "graph G {\n"
	gv += "\tlayout=neato\n"
	gv += "\toverlap=false\n"
	gv += "\tsep=\"+20\"\n"

	for vertexLabel, vertex := range g.data {
		if g.degree(vertexLabel) == 0 {
			gv += fmt.Sprintf("\t\"%v\";\n", vertexLabel)
			continue
		}

		for _, e := range vertex.edges {
			gv += fmt.Sprintf("\t\"%v\" -- \"%v\";\n", vertexLabel, e.label)
		}
	}

	gv += "}\n"
	return gv
}

var world multigraph

// GET /neato
// Fetch a Graphviz encoded representation of the global network topology, 'neato' layout
func handleNeato(w http.ResponseWriter, r *http.Request) {
	g := world.toGraphvizNeato()
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(g))
}

// POST /exec
// Execute a state change
func handleExec(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		common.Debugf("Error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	inst := netstatecl.Instruction{}
	err = json.Unmarshal(b, &inst)
	if err != nil {
		common.Debugf("Error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	// XXX: A word about the graph we're building: as of 12/18/2023, only uncensored users report
	// to netstate, and we build a network graph based on their view of the world. When they connect
	// or disconnect from a censored consumer, they report it here, and we're able to add or remove
	// a censored vertex accordingly. One consequence of this rather funky approach is that we derive
	// vertex labels for uncensored and censored users in two different ways: for uncensored vertices,
	// we use the IP addr (no port) from their HTTP request plus their self-reported tag, but for censored
	// vertices, we use the remote IP addr (no port) and tag which as passed as operation arguments by the
	// uncensored user. Given these two different derivations, our vertex labeling scheme is pretty
	// brittle and could easily result in broken network graphs. The correct solution is to push the
	// necessary changes to censored Lantern clients such that they report themselves to netstate!
	addrPort, err := netip.ParseAddrPort(r.RemoteAddr)
	if err != nil {
		common.Debugf("Error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	localLabel := vertexLabel(fmt.Sprintf("%v (%v)", addrPort.Addr().String(), inst.Tag))

	// TODO: This switch is the interpreter, we could extract it into a function
	switch inst.Op {
	case netstatecl.OpConsumerState:
		consumers := netstatecl.DecodeArgsOpConsumerState(inst.Args)

		// 1. Idempotently add a vertex representing the reporting node, updaing its lastSeen time
		// 2. Idempotently add a vertex representing each reported consumer, updating its lastSeen time
		// 3. Replace the reporting node's edges with a new set of edges representing its current consumers

		world.addVertex(localLabel)
		var newEdges []edge

		for _, c := range consumers {
			remoteAddr, remoteTag, workerIdx := c[0], c[1], c[2]
			remoteLabel := vertexLabel(fmt.Sprintf("%v (%v)", remoteAddr, remoteTag))
			world.addVertex(remoteLabel)
			newEdges = append(newEdges, edge{label: remoteLabel, id: workerIdx})
		}

		vv := world.data[localLabel]
		vv.edges = newEdges
		world.data[localLabel] = vv
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("200\n"))
	common.Debug(world.data)
}

// TODO: delete me and replace with a real CORS strategy!
func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Credentials", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT")
	(*w).Header().Set(
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, "+
			"Access-Control-Request-Method, Access-Control-Request-Headers",
	)
}

func main() {
	// The gv client is hardcoded to hit the /neato endpoint on port 8080, so we don't currently
	// support running netstated on a different port
	port := 8080

	world = *newMultigraph()

	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Addr:         fmt.Sprintf(":%v", port),
	}
	http.Handle("/", http.FileServer(http.Dir("./webclients/gv/public")))
	http.HandleFunc("/exec", handleExec)
	http.HandleFunc("/neato", handleNeato)
	common.Debugf("netstated listening on %v", srv.Addr)
	err := srv.ListenAndServe()
	if err != nil {
		common.Debug(err)
	}
}
