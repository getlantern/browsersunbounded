package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/getlantern/broflake/netstate/client"
)

type vertex string

// Parallel edges possess the same label but must have different IDs
// don't create multiple edges of vertex v with the same ID!
type edge struct {
	label vertex
	id    string
}

// multigraph is a threadsafe multigraph represented as an adjacency list. It's an identity bearing
// multigraph (parallel edges between vertices possess distinct identities)
type multigraph struct {
	data map[vertex][]edge
	sync.RWMutex
}

func newMultigraph() *multigraph {
	return &multigraph{data: make(map[vertex][]edge)}
}

// Idempotently add a vertex
func (g *multigraph) addVertex(v vertex) {
	g.Lock()
	defer g.Unlock()

	if _, ok := g.data[v]; !ok {
		g.data[v] = []edge{}
	}
}

// Idempotently delete a vertex
func (g *multigraph) delVertex(v vertex) {
	g.Lock()
	defer g.Unlock()
	delete(g.data, v)
}

// Get the degree of vertex v, returns 0 if v does not exist
func (g *multigraph) degree(v vertex) int {
	g.RLock()
	defer g.RUnlock()
	return len(g.data[v])
}

// Add an edge e to vertex v, if v does not exist it will be created
func (g *multigraph) addEdge(v vertex, e edge) {
	g.addVertex(v)
	g.Lock()
	defer g.Unlock()
	g.data[v] = append(g.data[v], e)
}

// Delete a single instance of a potentially parallel edge of vertex v by ID
func (g *multigraph) delEdge(v vertex, id string) {
	g.Lock()
	defer g.Unlock()

	if _, ok := g.data[v]; !ok {
		return
	}

	for i, ee := range g.data[v] {
		if ee.id == id {
			g.data[v][i] = g.data[v][len(g.data[v])-1]
			g.data[v] = g.data[v][:len(g.data[v])-1]
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

	for vertex, edges := range g.data {
		for _, e := range edges {
			gv += fmt.Sprintf("\t\"%v\" -- \"%v\";\n", vertex, e.label)
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
		log.Printf("Error: %v\n", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	inst := netstatecl.Instruction{}
	err = json.Unmarshal(b, &inst)
	if err != nil {
		log.Printf("Error: %v\n", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	// TODO: This switch is the interpreter, we could extract it into a function
	switch inst.Op {
	case netstatecl.OpConsumerConnectionChange:
		state, workerIdx, addr, remoteTag := inst.Args[0], inst.Args[1], inst.Args[2], inst.Args[3]
		label := fmt.Sprintf("%v (%v)", remoteTag, addr)

		switch state {
		case "1":
			world.addVertex(vertex(inst.Tag))
			world.addEdge(vertex(inst.Tag), edge{vertex(label), workerIdx})
		case "-1":
			world.delEdge(vertex(inst.Tag), workerIdx)
			if world.degree(vertex(label)) == 0 {
				world.delVertex(vertex(label))
			}
		}
	}

	log.Println(world.data)
	w.WriteHeader(http.StatusOK)
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
	log.Printf("netstated listening on %v\n\n", srv.Addr)
	err := srv.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}
