import wasmClient from '../utils/wasmBinding'
import {mockAddr, mockRandomInt} from './mockData'
import {
	Connection
} from '../utils/wasmInterface'

/***
	This is a mock implementation of the wasm client. It is used in place of the actual wasm client
 	when the MOCK_DATA env flag is set to true. The mock client fires fake events at a regular intervals.
 ***/

const defaultConnections: Connection[] = [...Array(5)].map((_, i) => (
	{state: -1, addr: mockAddr[i], workerIdx: i}
))

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class MockWasmClient {
	connections: Connection[]
	tick: number
	interval: NodeJS.Timer | undefined

	constructor() {
		this.tick = 0
		this.connections = defaultConnections
	}

	start = () => {
		this.interval = setInterval(() => {
			const active = this.connections.filter(c => c.state === 1)
			const chunks = [...Array(active.length)].map((_, i) => (
				{
					size: mockRandomInt(0, 1000000),
					workerIdx: i
				}
			))
			let throughput = 0
			// fire fake chunk events
			chunks.forEach(chunk => {
				throughput += chunk.size
				wasmClient._fire('downstreamChunk', chunk)
			})
			// fire fake throughput events
			wasmClient._fire('downstreamThroughput', {bytesPerSec: throughput})
			if ((this.tick === 0 || this.tick % 10 === 0) && active.length !== 5) {
				this.connections = this.connections.map((_, i) => (
					{state: i === active.length ? 1 : this.connections[i].state, addr: mockAddr[i], workerIdx: i}
				))
				const connection = this.connections[active.length]
				// fire fake connection event
				wasmClient._fire('consumerConnectionChange', connection)
			}
			this.tick += 1
		}, 250)
	}

	stop = async () => {
		clearInterval(this.interval)
		this.connections = defaultConnections
		this.connections.forEach(connection => wasmClient._fire('consumerConnectionChange', connection))
		for (let i = 0; i < 50; i++) {
			await sleep(50)
			wasmClient._fire('downstreamThroughput', {bytesPerSec: 0})
		}
		setTimeout(() => this.ready(), 2000)
	}
	ready = () => {
		wasmClient._fire('ready', {})
	}
}

const mockWasmClient = new MockWasmClient()
export default mockWasmClient