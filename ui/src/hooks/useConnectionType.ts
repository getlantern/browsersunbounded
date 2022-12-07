import {useEffect, useState} from 'react'
import {usePrevious} from './usePrevious'

export enum ConnectionTypes {
	FAST = 'fast',
	SLOW = 'slow',
}

// mbps from bytes and seconds
const toMbps = (bytes: number, s: number) => {
	return (bytes * 8) / s / 1024 / 1024
}

// download a test file and return the download speed
// to determine the connection type of the user
// if the connection api is not supported
const getDownloadSpeed = async (): Promise<number> => {
	const url = process.env.REACT_APP_WIDGET_SPEED_TEST_URL!
	const startTime = new Date().getTime()
	const noCache = '?nnn=' + startTime
	try {
		const response = await fetch(url + noCache)
		if (!response.ok) return 0
		const endTime = new Date().getTime()
		const duration = (endTime - startTime) / 1000
		const fileSize = parseInt(response.headers.get('Content-Length')!)
		return toMbps(fileSize, duration)
	} catch (e) {
		console.log('error', e)
		return 0
	}
}

interface Connection {
	effectiveType: string
	downlink: number
	addEventListener(change: string, changeHandler: (connection: Connection) => void): void
	removeEventListener(change: string, changeHandler: (connection: Connection) => void): void
}

// effective types https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType
const slowEffectiveTypes = ['slow-2g', '2g', '3g']
const isSlow = (connection: Connection) => slowEffectiveTypes.includes(connection.effectiveType) || connection.downlink < 10


export const useConnectionType = (testConnection: boolean): ConnectionTypes => {
	const prevTestConnection = usePrevious(testConnection)
	const [connectionType, setConnectionType] = useState<ConnectionTypes>(ConnectionTypes.FAST)
	useEffect(() => {
		if (prevTestConnection === testConnection) return // only subscribe and test connection on state changes
		// @ts-ignore
		const connection = navigator.connection as Connection

		const getConnectionType = async (): Promise<ConnectionTypes> => {
			if (connection) {
				return isSlow(connection) ? ConnectionTypes.SLOW : ConnectionTypes.FAST
			} else {
				const downloadSpeed = await getDownloadSpeed()
				return downloadSpeed < 20 ? ConnectionTypes.SLOW : ConnectionTypes.FAST // > 20 mbps is an approximation for "fast" connections
			}
		}

		if (testConnection) getConnectionType().then(setConnectionType)

		const changeHandler = (connection: Connection) => {
			setConnectionType(isSlow(connection) ? ConnectionTypes.SLOW : ConnectionTypes.FAST)
		}
		if (connection && testConnection) connection.addEventListener('change', changeHandler)

		return () => {
			if (connection && testConnection) connection.removeEventListener('change', changeHandler)
		}
	}, [testConnection, prevTestConnection])

	return connectionType
}