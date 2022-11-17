"use strict";

// Usage:
// wasmClient.addEventListener("downstreamChunk", (e) => {})
// wasmClient.start()
// wasmClient.stop()

var wasmClient = new EventTarget(); // must use 'var' to put wasmClient in the global scope

// These three stubs are only here for code comprehension, Wasm World overwrites them during init
wasmClient.start = () => {}
wasmClient.stop = () => {}
wasmClient.debug = () => {}

wasmClient._fire = (eventName, detail) => {
  wasmClient.dispatchEvent(new CustomEvent(eventName, {detail: detail}))
}

// 'downstreamChunk' fires once for each chunk of data received 
// 'size' is the size of the chunk in bytes, 'workerIdx' is the 0-indexed ID of the connection slot
wasmClient._onDownstreamChunk = (size, workerIdx) => {
  wasmClient._fire("downstreamChunk", {size: size, workerIdx: workerIdx})
}

// 'downstreamThroughput' fires N times per second, where N is determined by the uiRefreshHz 
// hyperparameter on the Go side. 'bytesPerSec' is the current systemwide inbound throughput
wasmClient._onDownstreamThroughput = (bytesPerSec) => {
  wasmClient._fire("downstreamThroughput", {bytesPerSec: bytesPerSec})
}

// 'consumerConnectionChange' fires when a consumer connects or disconnects. 'newState' is 1 or -1,
// representing connection or disconnection, respectively; 'workerIdx' is the 0-indexed ID of the
// connection slot; 'loc' represents the geographic location of the consumer
wasmClient._onConsumerConnectionChange = (newState, workerIdx, loc) => {
  wasmClient._fire("consumerConnectionChange", {newState: newState, workerIdx: workerIdx, loc: loc})
}
