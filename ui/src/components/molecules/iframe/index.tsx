import React, {useCallback, useEffect, useRef} from 'react'
import {Chunk, lifetimeChunksEmitter, lifetimeConnectionsEmitter, wasmInterface} from '../../../utils/wasmInterface'
import {useEmitterState} from '../../../hooks/useStateEmitter'

/***
	Since the widget can be embeded in any website, this iframe is used to
  store data in the local storage of a lantern domain. We use the iframe
  messaging API to sync data between the widget and the iframe. See the iframe.html
  file in the public dir for more details.
 ***/
enum StorageKeys {
	LIFETIME_CONNECTIONS = 'lifetimeConnections',
	LIFETIME_CHUNKS = 'lifetimeChunks',
}

enum MessageTypes {
	STORAGE_GET = 'storageGet',
	STORAGE_SET = 'storageSet',
}

const SIGNATURE = 'broflake'

const Iframe = () => {
	const synced = useRef({[StorageKeys.LIFETIME_CONNECTIONS]: false, [StorageKeys.LIFETIME_CHUNKS]: false})
	const iframe = useRef<HTMLIFrameElement>(null)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	const lifetimeChunks = useEmitterState(lifetimeChunksEmitter)

	const onMessage = useCallback((event: MessageEvent) => {
		const message = event.data
		if (typeof message !== 'object' || message === null || !message.hasOwnProperty(SIGNATURE)) return
		switch (message.type) {
			case MessageTypes.STORAGE_GET:
				const keys = Object.keys(message.data)
				// handle lifetime connections messages from the iframe local storage
				if (keys.includes(StorageKeys.LIFETIME_CONNECTIONS)) {
					const value = parseInt(message.data[StorageKeys.LIFETIME_CONNECTIONS]) || 0
					lifetimeConnectionsEmitter.update(lifetimeConnectionsEmitter.state + value)
					synced.current[StorageKeys.LIFETIME_CONNECTIONS] = true
				}
				// handle lifetime chunks messages from the iframe local storage
				if (keys.includes(StorageKeys.LIFETIME_CHUNKS)) {
					let value = []
					try {
						value = JSON.parse(message.data[StorageKeys.LIFETIME_CHUNKS]) || []
					} catch (e) {
						console.error(e)
					}
					value.forEach((chunk: Chunk) => wasmInterface.handleChunk({detail: chunk}))
					synced.current[StorageKeys.LIFETIME_CHUNKS] = true
				}
				break
		}
	}, [])

	const onLoad = useCallback(() => {
		iframe.current!.contentWindow!.postMessage({
			type: MessageTypes.STORAGE_GET,
			broflake: true,
			data: {
				key: 'lifetimeChunks'
			}
		}, '*')
		iframe.current!.contentWindow!.postMessage({
			type: MessageTypes.STORAGE_GET,
			broflake: true,
			data: {
				key: 'lifetimeConnections'
			}
		}, '*')
	}, [iframe])

	useEffect(() => {
		if (!iframe.current) return
		const iframeRef = iframe.current
		window.addEventListener('message', onMessage)
		iframeRef.addEventListener('load', onLoad)

		return () => {
			if (iframeRef) iframeRef.removeEventListener('load', onLoad)
			window.removeEventListener('message', onMessage)
		}
	}, [onLoad, onMessage, iframe])

	useEffect(() => {
		if (!iframe.current || !synced.current?.[StorageKeys.LIFETIME_CONNECTIONS]) return
		iframe.current.contentWindow!.postMessage({
			type: MessageTypes.STORAGE_SET,
			[SIGNATURE]: true,
			data: {
				key: StorageKeys.LIFETIME_CONNECTIONS,
				value: lifetimeConnections
			}
		}, '*')
	}, [lifetimeConnections])

	useEffect(() => {
		if (!iframe.current || !synced.current?.[StorageKeys.LIFETIME_CHUNKS]) return
		iframe.current.contentWindow!.postMessage({
			type: MessageTypes.STORAGE_SET,
			[SIGNATURE]: true,
			data: {
				key: StorageKeys.LIFETIME_CHUNKS,
				value: JSON.stringify(lifetimeChunks)
			}
		}, '*')
	}, [lifetimeChunks])

	return (
		<iframe
			src={process.env.REACT_APP_IFRAME_SRC}
			style={{display: 'none'}}
			title={`${SIGNATURE} iframe`}
			ref={iframe}
		/>
	)
}

export default Iframe