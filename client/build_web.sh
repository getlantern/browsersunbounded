#!/usr/bin/bash
set -x
cd go
GOOS=js GOARCH=wasm go build --ldflags="-X 'main.clientType=widget'" -o ../dist/public/widget.wasm
cd ..
# TODO: minify?
cp js/bindings.js dist/public/
