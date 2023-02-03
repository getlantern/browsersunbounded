#!/usr/bin/env bash
set -x
GOOS=js GOARCH=wasm go build -o ./dist/public/widget.wasm
cp ./dist/public/widget.wasm ../ui/public
