#!/usr/bin/env bash
set -ux
go build -race -o ./dist/bin/$1 --ldflags="-X 'main.clientType=$1'"
