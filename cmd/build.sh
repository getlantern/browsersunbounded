#!/usr/bin/bash
set -x
go build -race -o ./dist/bin/$1 --ldflags="-X 'main.clientType=$1'"
