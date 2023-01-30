import go from './goWasmExec'
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
	addr: string
}
export interface Throughput {
	bytesPerSec: number
}

// create state emitters
export const connectionsEmitter = new StateEmitter<Connection[]>([])
export const lifetimeConnectionsEmitter = new StateEmitter<number>(0)
export const readyEmitter = new StateEmitter<boolean>(false)
export const sharingEmitter = new StateEmitter<boolean>(false)

// bind the client constructor
declare global {
	function newBroflake(
		type: string, 
		cTableSz: number, 
		pTableSz: number, 
		busBufSz: number, 
		netstated: string, 
		tag: string
	): any
}

class WasmInterface {
	go: typeof go
	wasmClient: any | undefined
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
	// states
	ready: boolean

	constructor() {
		this.ready = false
		this.chunkMap = {}
		this.connectionMap = {}
		this.throughput = { bytesPerSec: 0 }
		this.movingAverageThroughput = 0
		this.lifetimeConnections = 0
		this.chunks = []
		this.connections = []
		this.go = go
	}

	initialize = async (): Promise<WebAssemblyInstance> => {
		if (!this.instance) {
			const res = await WebAssembly.instantiateStreaming(
				fetch(process.env.REACT_APP_WIDGET_WASM_URL!), this.go.importObject
			)
			this.instance = res.instance
			this.go.run(this.instance)
			this.wasmClient = globalThis.newBroflake("widget", 5, 5, 4096, "", "")
			this.initListeners()
			this.handleReady()
		}
		return this.instance
	}

	start = () => {
		if (!this.ready) console.warn('Wasm client is not in ready state, aborting start')
		else {
			this.wasmClient.start()
			sharingEmitter.update(true)
		}
	}

	stop = () => {
		this.ready = false
		readyEmitter.update(this.ready)
		this.wasmClient.stop()
		sharingEmitter.update(false)
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

	handleReady = () => {
		this.ready = true
		readyEmitter.update(this.ready)
	}

	initListeners = () => {
		// rm listeners in case they exist (hot reload)
		this.wasmClient.removeEventListener('downstreamChunk', this.handleChunk)
		this.wasmClient.removeEventListener('downstreamThroughput', this.handleThroughput)
		this.wasmClient.removeEventListener('consumerConnectionChange', this.handleConnection)
		this.wasmClient.removeEventListener('ready', this.handleReady)
		// register listeners
		this.wasmClient.addEventListener('downstreamChunk', this.handleChunk)
		this.wasmClient.addEventListener('downstreamThroughput', this.handleThroughput)
		this.wasmClient.addEventListener('consumerConnectionChange', this.handleConnection)
		this.wasmClient.addEventListener('ready', this.handleReady)
	}
}

export const wasmInterface = process.env.REACT_APP_MOCK_DATA === 'true' ? new MockWasmInterface() : new WasmInterface()
wasmInterface.initialize().then(() => console.log('p2p wasm initialized!'))