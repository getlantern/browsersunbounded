#!/usr/bin/env bash
# The Derek Option

trap "kill 0" EXIT
set -u

for (( i=1; i <=$1; i++ ))
do
  PORT=$((1080 + $i)) dist/bin/desktop &
done

wait
