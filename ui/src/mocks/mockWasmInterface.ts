import {Chunk, Connection, connectionsEmitter, lifetimeConnectionsEmitter, Throughput} from '../utils/wasmInterface'
import {mockGeo, mockRandomInt} from './mockData'

export class MockWasmInterface {
	// raw data
	throughput: Throughput
	// smoothed and agg data
	movingAverageThroughput: number
	lifetimeConnections: number
	chunks: Chunk[]
	connections: Connection[]
	tick: number
	interval: NodeJS.Timer | undefined

	constructor() {
		this.throughput = { bytesPerSec: 0 }
		this.movingAverageThroughput = 0
		this.lifetimeConnections = 0
		this.chunks = []
		this.connections = [...Array(5)].map((_,i) => (
			{state: -1, loc: mockGeo[i], workerIdx: i}
		))
		this.tick = 0
	}

	initialize = async () => {
		// nada
	}
	start = () => {
		this.interval = setInterval(() => {
			const active = this.connections.filter(c => c.state === 1)
			this.throughput = {bytesPerSec: mockRandomInt(0, 10000) * active.length}
			this.movingAverageThroughput = (this.movingAverageThroughput + this.throughput.bytesPerSec) / 2
			this.chunks = [...Array(5)].map((_,i) => (
				{size: this.chunks[i]?.size ?  this.chunks[i]?.size + mockRandomInt(0, 10000) * active.length : mockRandomInt(0, 10000), workerIdx: i}
			))
			if ((this.tick === 0 || this.tick % 10 === 0) && active.length !== 5) {
				this.lifetimeConnections = this.lifetimeConnections += 1
				this.connections = this.connections.map((_,i) => (
					{state: i === active.length ? 1 : this.connections[i].state, loc: mockGeo[i], workerIdx: i}
				))
				// emit state
				connectionsEmitter.update(this.connections)
				lifetimeConnectionsEmitter.update(this.lifetimeConnections)
			}
			this.tick += 1
		}, 250)
	}


	stop = () => {
		clearInterval(this.interval)
		this.throughput = {bytesPerSec: 0}
		this.movingAverageThroughput = 0
		this.connections = this.connections.map(c => ({...c, state: -1}))
		// emit state
		connectionsEmitter.update(this.connections)
	}
}