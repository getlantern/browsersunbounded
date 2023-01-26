#!/usr/bin/bash
set -x
GOOS=js GOARCH=wasm go build --ldflags="-X 'main.clientType=widget'" -o ./dist/public/widget.wasm
cp ./dist/public/widget.wasm ../ui/public
