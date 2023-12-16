package netstatecl

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type operation int

const (
	OpConsumerConnectionChange = iota // Args: [state, workerIdx, IP address, tag]
)

// TODO: add a Lamport timestamp?
type Instruction struct {
	Op   operation
	Args []string
	Tag  string
}

func Exec(netstated string, inst *Instruction) error {
	serialized, err := json.Marshal(inst)
	if err != nil {
		return err
	}

	res, err := http.Post(netstated, "application/json; charset=UTF-8", bytes.NewBuffer(serialized))

	if res != nil {
		res.Body.Close()
	}

	return err
}
