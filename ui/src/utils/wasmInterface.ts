import go from './goWasmExec'
import wasmClient from './wasmBinding'
import {StateEmitter} from '../hooks/useStateEmitter'
import mockWasmClient from '../mocks/mockWasmClient'

const MOCK_CLIENT = process.env.REACT_APP_MOCK_DATA === 'true'

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
export const averageThroughputEmitter = new StateEmitter<number>(0)
export const lifetimeConnectionsEmitter = new StateEmitter<number>(0)
export const lifetimeChunksEmitter = new StateEmitter<Chunk[]>([])
export const readyEmitter = new StateEmitter<boolean>(false)
export const sharingEmitter = new StateEmitter<boolean>(false)

class WasmInterface {
	go: typeof go
	wasmClient: typeof wasmClient
	instance: WebAssemblyInstance | undefined
	// raw data
	connectionMap: {[key: number]: Connection}
	throughput: Throughput
	// smoothed and agg data
	connections: Connection[]
	// states
	ready: boolean

	constructor() {
		this.ready = false
		this.connectionMap = {}
		this.throughput = { bytesPerSec: 0 }
		this.connections = []
		this.go = go
		this.wasmClient = wasmClient
	}

	initialize = async (mock = false): Promise<WebAssemblyInstance | undefined> => {
		if (mock) {
			await this.mockInitialize()
			return // if mocking data, skip wasm init mock client does not return an instance
		}
		if (!this.instance) {
			const res = await WebAssembly.instantiateStreaming(
				fetch(process.env.REACT_APP_WIDGET_WASM_URL!), this.go.importObject
			)
			this.instance = res.instance
			this.initListeners()
			this.go.run(this.instance) // do not await this is blocking till the exit promise is resolved
		}
		return this.instance
	}

	mockInitialize = async () => {
		this.initListeners()
		mockWasmClient.ready()
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
		const chunks = [...lifetimeChunksEmitter.state, detail].reduce((acc: Chunk[], chunk) => {
			const found = acc.find((c: Chunk) => c.workerIdx === chunk.workerIdx)
			if (found) found.size += chunk.size
			else acc.push(chunk)
			return acc
		}, [])
		lifetimeChunksEmitter.update(chunks)
	}

	handleThroughput = (e: { detail: Throughput }) => {
		const {detail} = e
		this.throughput = detail
		// calc moving average for time series smoothing and emit state
		averageThroughputEmitter.update((averageThroughputEmitter.state + detail.bytesPerSec) / 2)
	}

	handleConnection = (e: { detail: Connection }) => {
		const {detail: connection} = e
		const {state, workerIdx} = connection
		const existingState = this.connectionMap[workerIdx]?.state || -1
		this.connectionMap = {
			...this.connectionMap,
			[workerIdx]: connection
		}
		this.connections = this.idxMapToArr(this.connectionMap)
		// emit state
		connectionsEmitter.update(this.connections)
		if (existingState === -1 && state === 1) {
			lifetimeConnectionsEmitter.update(lifetimeConnectionsEmitter.state + 1)
		}
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

export const wasmInterface = new WasmInterface()

wasmInterface.initialize(MOCK_CLIENT).then(() => console.log('p2p wasm initialized!'))