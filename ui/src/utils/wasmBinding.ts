// @ts-nocheck @todo add types

// Usage example:
// wasmClient.addEventListener("downstreamChunk", (e) => {})

globalThis.wasmClient = new EventTarget() // must be in global scope

wasmClient._fire = (eventName, detail) => {
	wasmClient.dispatchEvent(new CustomEvent(eventName, {detail: detail}))
}

// These three stubs are only here for code comprehension, Wasm World overwrites them during init
wasmClient.start = () => {}
wasmClient.stop = () => {}
wasmClient.debug = () => {}

// 'ready' fires when the client is ready to be started with a call to `start`
// after calling `stop`, you must wait for the `ready` event before calling `start` again!
wasmClient._onReady = () => {
	wasmClient._fire("ready", {})
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

// 'consumerConnectionChange' fires when a consumer connects or disconnects. 'state' is 1 or -1,
// representing connection or disconnection, respectively; 'workerIdx' is the 0-indexed ID of the
// connection slot; 'loc' represents the geographic location of the consumer
wasmClient._onConsumerConnectionChange = (state, workerIdx, loc) => {
	wasmClient._fire("consumerConnectionChange", {state: state, workerIdx: workerIdx, loc: loc})
}

export default wasmClient