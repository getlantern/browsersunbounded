#!/usr/bin/env bash
# The Derek Option, Widget Edition
# Usage: ./werek.sh 100
# (spin up 100 uncensored peers)

trap "kill 0" EXIT
set -ue

for (( i=1; i <=$1; i++ ))
do
  dist/bin/widget &
done

wait
