#!/usr/bin/env bash
set -xe
GOOS=js GOARCH=wasm go build -ldflags "-s -w" -o ./dist/public/widget.wasm
cp ./dist/public/widget.wasm ../ui/public
