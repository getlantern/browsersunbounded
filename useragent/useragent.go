package main

import (
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
)

const (
	testFile = "https://speed.hetzner.de/1GB.bin"
)

func main() {
	client1 := http.Client{
		Transport: &http.Transport{
			Proxy: func(*http.Request) (*url.URL, error) {
				return url.Parse("http://127.0.0.1:1080")
			},
		},
	}
	client2 := http.Client{
		Transport: &http.Transport{
			Proxy: func(*http.Request) (*url.URL, error) {
				return url.Parse("http://127.0.0.1:1081")
			},
		},
	}

	var wg sync.WaitGroup
	wg.Add(2)

	// Download something large on a couple of goroutines, one of which misbehaves and doesn't read the response
	go func() {
		defer wg.Done()

		resp, err := client1.Get(testFile)
		if err != nil {
			log.Fatalf("Client1 request error %v\n", err)
		}
		total := 0
		b := make([]byte, 8192)
		for {
			n, err := resp.Body.Read(b)
			total += n
			if err == io.EOF {
				log.Printf("Client1 read %d bytes\n", total)
				return
			}
			if err != nil {
				log.Fatalf("Client1 read error %v\n", err)
			}
		}
	}()

	go func() {
		defer wg.Done()

		_, err := client2.Get(testFile)
		if err != nil {
			log.Fatalf("Client1 request error %v\n", err)
		}
		// ignore response body
		return
	}()

	wg.Wait()
}
