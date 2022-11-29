import {useEffect, useState} from 'react'
import {Chunk, Connection, connectionsEmitter, lifetimeConnectionsEmitter, wasmInterface} from '../utils/wasmInterface'
import {useEmitterState} from './useStateEmitter'

interface Stats {
	throughput: number
	lifetimeConnections: number
	connections: Connection[]
	chunks: Chunk[]
}

interface StatsIntervalState {
	throughput: number
	chunks: Chunk[]
}

export const useStats = ({sampleMs = 500}: { sampleMs?: number }): Stats => {
	const connections = useEmitterState(connectionsEmitter)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	const [stats, setStats] = useState<StatsIntervalState>({
		throughput: 0,
		chunks: []
	})

	useEffect(() => {
		const updateStats = () => {
			setStats({
				throughput: wasmInterface.movingAverageThroughput,
				chunks: wasmInterface.chunks
			})
		}
		const interval = setInterval(updateStats, sampleMs)
		return () => clearInterval(interval)
	}, [sampleMs])

	return {
		...stats,
		connections,
		lifetimeConnections
	}
}