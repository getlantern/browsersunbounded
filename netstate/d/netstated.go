package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/getlantern/broflake/netstate/client"
)

type vertex string

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

// Get the degree of vertex v
// TODO: this is unsafe
func (g *multigraph) degree(v vertex) int {
	g.RLock()
	defer g.RUnlock()
	return len(g.data[v])
}

// Add an edge
// TODO: this is safe, but inefficient
func (g *multigraph) addEdge(v vertex, e edge) {
	g.addVertex(v)
	g.Lock()
	defer g.Unlock()
	g.data[v] = append(g.data[v], e)
}

// Delete an instance of a potentially parallel edge by id
// TODO: this is unsafe
func (g *multigraph) delEdge(v vertex, id string) {
	g.Lock()
	defer g.Unlock()

	for i, ee := range g.data[v] {
		if ee.id == id {
			g.data[v][i] = g.data[v][len(g.data[v])-1]
			g.data[v] = g.data[v][:len(g.data[v])-1]
			return
		}
	}
}

// Encode this multigraph using Graphviz syntax using the 'neato' layout
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

func handleRoot(w http.ResponseWriter, r *http.Request) {
	g := world.toGraphvizNeato()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(g))
}

func handleExec(w http.ResponseWriter, r *http.Request) {
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400\n"))
		return
	}

	inst := netstatecl.Instruction{}
	err = json.Unmarshal(b, &inst)
	if err != nil {
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

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	world = *newMultigraph()

	srv := &http.Server{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Addr:         fmt.Sprintf(":%v", port),
	}
	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/exec", handleExec)
	log.Printf("netstated listening on %v\n\n", srv.Addr)
	err := srv.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}
