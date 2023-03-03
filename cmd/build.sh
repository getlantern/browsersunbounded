#!/usr/bin/env bash
set -xue

echo Building desktop native binary...
go build -race -o ./dist/bin/desktop --ldflags="-X 'main.clientType=desktop' -X 'github.com/getlantern/broflake/common.ProtocolVersion=$1'"

echo Building widget native binary...
go build -race -o ./dist/bin/widget --ldflags="-X 'main.clientType=widget' -X 'github.com/getlantern/broflake/common.ProtocolVersion=$1'"

echo Building widget wasm...
GOOS=js GOARCH=wasm go build -o ./dist/public/widget.wasm --ldflags="-X 'main.clientType=widget' \
  -X 'github.com/getlantern/broflake/common.ProtocolVersion=$1'"
cp ./dist/public/widget.wasm ../ui/public
