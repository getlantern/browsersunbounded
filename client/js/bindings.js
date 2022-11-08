"use strict";

// Usage example:
// wasmClient.addEventListener("downstreamChunk", (e) => {})

var wasmClient = new EventTarget(); // must use 'var' to put wasmClient in the global scope

wasmClient._fire = (eventName, detail) => {
  wasmClient.dispatchEvent(new CustomEvent(eventName, {detail: detail}))
}

wasmClient._onDownstreamChunk = (size, workerIdx) => {
  wasmClient._fire("downstreamChunk", {size: size, workerIdx: workerIdx})
}

wasmClient._onDownstreamThroughput = (bytesPerSec) => {
  wasmClient._fire("downstreamThroughput", {bytesPerSec: bytesPerSec})
}

wasmClient._onConsumerConnectionChange = (newState, workerIdx, loc) => {
  wasmClient._fire("consumerConnectionChange", {newState: newState, workerIdx: workerIdx, loc: loc})
}
