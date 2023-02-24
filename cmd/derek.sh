#!/usr/bin/env bash
# The Derek Option
# Usage: ./derek.sh 100
# (spin up 100 censored peers)

trap "kill 0" EXIT
set -ue

for (( i=1; i <=$1; i++ ))
do
  TAG=desktop${i} NETSTATED=http://localhost:8080/exec PORT=$((1080 + $i)) dist/bin/desktop &
done

wait
