import go from './goWasmExec'
import wasmClient from './wasmBinding'
import {mockGeo} from '../mocks/mockData'
import {MockWasmInterface} from '../mocks/mockWasmInterface'
import {StateEmitter} from '../hooks/useStateEmitter'

type WebAssemblyInstance = InstanceType<typeof WebAssembly.Instance>

export interface Chunk {
	size: number
	workerIdx: number
}
export interface Connection {
	state: 1 | -1
	workerIdx: number
	loc: {
		coords: number[]
		country: string
		count: number
	}
}
export interface Throughput {
	bytesPerSec: number
}

// create state emitters
export const connectionsEmitter = new StateEmitter<Connection[]>([])
export const lifetimeConnectionsEmitter = new StateEmitter<number>(0)

class WasmInterface {
	go: typeof go
	wasmClient: typeof wasmClient
	instance: WebAssemblyInstance | undefined
	// raw data
	chunkMap: {[key: number]: Chunk}
	connectionMap: {[key: number]: Connection}
	throughput: Throughput
	// smoothed and agg data
	movingAverageThroughput: number
	lifetimeConnections: number
	chunks: Chunk[]
	connections: Connection[]

	constructor() {
		this.chunkMap = {}
		this.connectionMap = {}
		this.throughput = { bytesPerSec: 0 }
		this.movingAverageThroughput = 0
		this.lifetimeConnections = 0
		this.chunks = []
		this.connections = []
		this.go = go
		this.wasmClient = wasmClient
	}

	initialize = async (): Promise<WebAssemblyInstance> => {
		if (!this.instance) {
			const res = await WebAssembly.instantiateStreaming(
				fetch(process.env.REACT_APP_WIDGET_WASM_URL!), this.go.importObject
			)
			this.instance = res.instance
			this.initListeners()
			await this.go.run(this.instance)
		}
		return this.instance
	}

	start = () => {
		this.wasmClient.start()
	}

	stop = () => {
		this.wasmClient.stop()
	}

	idxMapToArr = (map: {[key: number]: any}) => {
		return Object.keys(map).map(idx => map[parseInt(idx)])
	}

	handleChunk = (e: { detail: Chunk }) => {
		const {detail} = e
		const size = this.chunkMap[detail.workerIdx]?.size | 0
		this.chunkMap = {
			...this.chunkMap,
			[detail.workerIdx]: {...detail, size: detail.size + size}
		}
		this.chunks = this.idxMapToArr(this.chunkMap)
	}

	handleThroughput = (e: { detail: Throughput }) => {
		const {detail} = e
		this.throughput = detail
		// calc moving average for time series smoothing
		this.movingAverageThroughput = (this.movingAverageThroughput + detail.bytesPerSec) / 2
	}

	handleConnection = (e: { detail: Connection }) => {
		const {detail: connection} = e
		const {state, workerIdx} = connection
		connection.loc = mockGeo[workerIdx] // mock location
		const existingState = this.connectionMap[workerIdx]?.state || -1
		if (existingState === -1 && state === 1) this.lifetimeConnections += 1
		this.connectionMap = {
			...this.connectionMap,
			[workerIdx]: connection
		}
		this.connections = this.idxMapToArr(this.connectionMap)
		// emit state
		connectionsEmitter.update(this.connections)
		lifetimeConnectionsEmitter.update(this.lifetimeConnections)
	}

	initListeners = () => {
		// rm listeners in case they exist (hot reload)
		this.wasmClient.removeEventListener('downstreamChunk', this.handleChunk)
		this.wasmClient.removeEventListener('downstreamThroughput', this.handleThroughput)
		this.wasmClient.removeEventListener('consumerConnectionChange', this.handleConnection)
		// register listeners
		this.wasmClient.addEventListener('downstreamChunk', this.handleChunk)
		this.wasmClient.addEventListener('downstreamThroughput', this.handleThroughput)
		this.wasmClient.addEventListener('consumerConnectionChange', this.handleConnection)
	}
}

export const wasmInterface = process.env.REACT_APP_MOCK_DATA === 'true' ? new MockWasmInterface() : new WasmInterface()
wasmInterface.initialize().then(() => console.log('p2p wasm initialized!'))