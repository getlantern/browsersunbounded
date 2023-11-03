package main

import (
	"context"
	"fmt"
	"os"

	"github.com/getlantern/broflake/freddie"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}
	listenAddr := fmt.Sprintf(":%v", port)

	ctx := context.Background()
	f, err := freddie.New(ctx, listenAddr)
	if err != nil {
		panic(err)
	}

	if err = f.ListenAndServe(); err != nil {
		panic(err)
	}
}
