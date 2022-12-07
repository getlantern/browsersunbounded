package main

import (
	"fmt"
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
	client1 := &http.Client{
		Transport: &http.Transport{
			Proxy: func(*http.Request) (*url.URL, error) {
				return url.Parse("http://127.0.0.1:1080")
			},
		},
	}
	client2 := &http.Client{
		Transport: &http.Transport{
			Proxy: func(*http.Request) (*url.URL, error) {
				return url.Parse("http://127.0.0.1:1081")
			},
		},
	}

	var wg sync.WaitGroup

	launchGoodClient := func(port string, client *http.Client, indicator string) {
		wg.Add(1)

		log.Printf("Launching good client to %v\n", port)

		go func() {
			defer wg.Done()

			resp, err := client.Get(testFile)
			if err != nil {
				log.Fatalf("Good Client to %v request error %v\n", port, err)
			}
			total := 0
			increment := 0
			b := make([]byte, 8192)
			for {
				n, err := resp.Body.Read(b)
				total += n
				increment += n
				if err == io.EOF {
					log.Printf("Good Client to %v read %d bytes\n", port, total)
					return
				}
				if err != nil {
					log.Fatalf("Good Client to %v Client1 read error %v\n", port, err)
				}
				if increment > 1024768 {
					fmt.Print(indicator)
					increment = 0
				}
			}
		}()
	}

	launchGoodClient("1080", client1, ".")
	launchGoodClient("1081", client2, "x")

	wg.Add(1)
	go func() {
		defer wg.Done()

		_, err := client2.Get(testFile)
		if err != nil {
			log.Fatalf("Client1 request error %v\n", err)
		}
		// ignore response body
	}()

	wg.Wait()
}
