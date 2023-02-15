import go from './goWasmExec'
import {StateEmitter} from '../hooks/useStateEmitter'
import MockWasmClient from '../mocks/mockWasmClient'

export enum Targets {
	'WEB' = 'web',
	'CHROME_EXTENSION_HEAD' = 'chrome-extension-head',
	'CHROME_EXTENSION_HEADLESS' = 'chrome-extension-headless',
}

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


export interface WasmClientEventMap {
	'ready': CustomEvent;
	'downstreamChunk': { detail: Chunk };
	'downstreamThroughput': { detail: Throughput };
	'consumerConnectionChange': { detail: Connection };
}

export interface WasmClient extends EventTarget {
	addEventListener<K extends keyof WasmClientEventMap>(
		type: K,
		listener: (e: WasmClientEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): void

	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean
	): void

	removeEventListener<K extends keyof WasmClientEventMap>(
		type: K,
		listener: (e: WasmClientEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): void

	removeEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean
	): void

	start(): void

	stop(): void

	debug(): void
}


// bind the client constructor
declare global {
	function newBroflake(
		type: string,
		cTableSz: number,
		pTableSz: number,
		busBufSz: number,
		netstated: string,
		tag: string
	): WasmClient
}

interface Config {
	mock: boolean
	target: Targets
}

export class WasmInterface {
	go: typeof go
	wasmClient: WasmClient | undefined
	instance: WebAssemblyInstance | undefined
	// raw data
	connectionMap: { [key: number]: Connection }
	throughput: Throughput
	// smoothed and agg data
	connections: Connection[]
	// states
	ready: boolean
	initializing: boolean
	target: Targets

	constructor() {
		this.ready = false
		this.initializing = false
		this.connectionMap = {}
		this.throughput = {bytesPerSec: 0}
		this.connections = []
		this.go = go
		this.target = Targets.WEB
	}


	initialize = async ({mock, target}: Config): Promise<WebAssemblyInstance | undefined> => {
		// this dumb state is needed to prevent multiple calls to initialize from react hot reload dev server 🥵
		if (this.initializing || this.instance) { // already initialized or initializing
			console.warn('Wasm client has already been initialized or is initializing, aborting init.')
			return
		}
		this.initializing = true
		this.target = target
		if (mock) { // fake it till you make it
			this.wasmClient = new MockWasmClient(this)
			this.instance = {} as WebAssemblyInstance
		} else { // the real deal (wasm)
			const res = await WebAssembly.instantiateStreaming(
				fetch(process.env.REACT_APP_WIDGET_WASM_URL!), this.go.importObject
			)
			this.instance = res.instance
			this.go.run(this.instance)
			this.wasmClient = globalThis.newBroflake(
				'widget',
				5,
				5,
				4096,
				'',
				''
			)
		}
		this.initListeners()
		this.handleReady()
		this.initializing = false
		return this.instance
	}

	start = () => {
		if (!this.ready) return console.warn('Wasm client is not in ready state, aborting start')
		if (!this.wasmClient) return console.warn('Wasm client has not been initialized, aborting start.')
		if (this.target === Targets.CHROME_EXTENSION_HEAD) chrome.runtime.sendMessage('start', () => null)
		else {
			this.wasmClient.start()
			sharingEmitter.update(true)
		}
	}

	stop = () => {
		if (!this.wasmClient) return console.warn('Wasm client has not been initialized, aborting stop.')
		if (this.target === Targets.CHROME_EXTENSION_HEAD) chrome.runtime.sendMessage('stop', () => null)
		else {
			this.ready = false
			readyEmitter.update(this.ready)
			this.wasmClient.stop()
			sharingEmitter.update(false)
		}
	}

	idxMapToArr = (map: { [key: number]: any }) => {
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
		if (!this.wasmClient) return console.warn('Wasm client has not been initialized, aborting listener init.')

		if (this.target === Targets.CHROME_EXTENSION_HEADLESS) {
			chrome.runtime.onMessage.addListener(request => {
				if (request === 'start') this.start()
				if (request === 'stop') this.stop()
			})
		}

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