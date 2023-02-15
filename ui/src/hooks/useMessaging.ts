import {
	averageThroughputEmitter,
	connectionsEmitter,
	lifetimeChunksEmitter,
	lifetimeConnectionsEmitter,
	readyEmitter,
	sharingEmitter,
	Targets,
	Chunk,
	Connection
} from '../utils/wasmInterface'
import {Dispatch, SetStateAction, useEffect} from 'react'

const emitterMap = {
	'sharing': sharingEmitter,
	'connections': connectionsEmitter,
	'lifetimeConnections': lifetimeConnectionsEmitter,
	'averageThroughput': averageThroughputEmitter,
	'lifetimeChunks': lifetimeChunksEmitter,
	'ready': readyEmitter
}

const useMessaging = (target: Targets) => {
	useEffect(() => {
		const handleReady = (value: boolean) => chrome.runtime.sendMessage({type: 'ready', value}, () => null)
		const handleSharing = (value: boolean) => chrome.runtime.sendMessage({type: 'sharing', value}, () => null)
		const handleConnections = (value: Connection[]) => chrome.runtime.sendMessage({type: 'connections', value}, () => null)
		const handleLifetimeConnections = (value: number) => chrome.runtime.sendMessage({type: 'lifetimeConnections', value}, () => null)
		const handleAverageThroughput = (value: number) => chrome.runtime.sendMessage({type: 'averageThroughput', value}, () => null)
		const handleLifetimeChunks = (value: Chunk[]) => chrome.runtime.sendMessage({type: 'lifetimeChunks', value}, () => null)

		if (target === Targets.CHROME_EXTENSION_HEAD) {
			chrome.runtime.onMessage.addListener((message) => {
				const type = message?.type as keyof typeof emitterMap | undefined
				// @ts-ignore
				if (type && emitterMap[type]) emitterMap[type].update(message.value)
			})
			chrome.runtime.sendMessage('hydrate', () => null)
		}
		else if (target === Targets.CHROME_EXTENSION_HEADLESS) {
			sharingEmitter.on(handleSharing as Dispatch<SetStateAction<boolean>>)
			connectionsEmitter.on(handleConnections as Dispatch<SetStateAction<Connection[]>>)
			lifetimeConnectionsEmitter.on(handleLifetimeConnections as Dispatch<SetStateAction<number>>)
			averageThroughputEmitter.on(handleAverageThroughput as Dispatch<SetStateAction<number>>)
			lifetimeChunksEmitter.on(handleLifetimeChunks as Dispatch<SetStateAction<Chunk[]>>)
			readyEmitter.on(handleReady as Dispatch<SetStateAction<boolean>>)

			chrome.runtime.onMessage.addListener((message) => {
				if (message === 'hydrate') {
					handleSharing(sharingEmitter.state)
					handleConnections(connectionsEmitter.state)
					handleLifetimeConnections(lifetimeConnectionsEmitter.state)
					handleAverageThroughput(averageThroughputEmitter.state)
					handleLifetimeChunks(lifetimeChunksEmitter.state)
					handleReady(readyEmitter.state)
				}
			})
		}
		return () => {
			if (target === Targets.CHROME_EXTENSION_HEAD) {
				chrome.runtime.onMessage.removeListener(() => null)
			}
			else if (target === Targets.CHROME_EXTENSION_HEADLESS) {
				sharingEmitter.off(handleSharing as Dispatch<SetStateAction<boolean>>)
				connectionsEmitter.off(handleConnections as Dispatch<SetStateAction<Connection[]>>)
				lifetimeConnectionsEmitter.off(handleLifetimeConnections as Dispatch<SetStateAction<number>>)
				averageThroughputEmitter.off(handleAverageThroughput as Dispatch<SetStateAction<number>>)
				lifetimeChunksEmitter.off(handleLifetimeChunks as Dispatch<SetStateAction<Chunk[]>>)
				readyEmitter.off(handleReady as Dispatch<SetStateAction<boolean>>)
			}
		}
	}, [target])
}

export default useMessaging