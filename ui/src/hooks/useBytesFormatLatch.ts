import {useEffect, useState} from 'react'

const factor = 1000 // 1024 for binary prefixes, 1000 for SI prefixes
const sizes = ['bytes', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']
// get size index from bytes
export const getIndex = (bytes: number) => bytes <= 1 ? 0 : Math.floor(Math.log(bytes) / Math.log(factor))
// format bytes to human-readable format
export const formatBytes = (bytes: number, index = 0, decimals = 1) => {
	if (bytes <= 1) return '0 bytes'
	return parseFloat((bytes / Math.pow(factor, index)).toFixed(decimals)) + ' ' + sizes[index]
}

// hook to format bytes to human-readable format based on average of last 10 samples
export const useBytesFormatLatch = (bytes = 0) => {
	const [window, setWindow] = useState<number[]>([getIndex(bytes)])
	const averageIndex = Math.round(window.reduce((a, b) => a + b, 0) / window.length)

	useEffect(() => {
		const index = getIndex(bytes)
		// rolling window of 10 indexes to use for averaging index
		setWindow([index, ...window].slice(0, 10))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bytes])

	return formatBytes(bytes, averageIndex)
}

export default useBytesFormatLatch