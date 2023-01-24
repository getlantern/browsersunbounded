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

	req, err := http.NewRequest("POST", netstated, bytes.NewBuffer(serialized))
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")

	client := &http.Client{}
	res, err := client.Do(req)
	defer res.Body.Close()
	return err
}
