#!/usr/bin/env bash
set -x
cd go
go build -race -o ../dist/bin/$1 --ldflags="-X 'main.clientType=$1'"
cd ..
