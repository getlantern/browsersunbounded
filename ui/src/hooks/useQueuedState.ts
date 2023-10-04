import {useState, useEffect, useRef} from 'react'

const useQueueState = <T>(propState: T, delay: number) => {
	const [state, setState] = useState<T>(propState)
	const [queue, setQueue] = useState<T[]>([])
	const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		if (timeoutIdRef.current === null && queue.length > 0) {
			const [nextState, ...rest] = queue
			setState(nextState)
			setQueue(rest)

			timeoutIdRef.current = setTimeout(() => {
				timeoutIdRef.current = null
				setQueue((prevQueue) => prevQueue.slice(1)) // remove processed state from queue
			}, delay)
		}
	}, [queue, delay])

	useEffect(() => {
		// Whenever propState changes, enqueue the new state
		setQueue((prevQueue) => [...prevQueue, propState])
	}, [propState])

	useEffect(() => {
		// Cleanup on unmount
		return () => {
			if (timeoutIdRef.current !== null) {
				clearTimeout(timeoutIdRef.current)
			}
		}
	}, [])

	return state
}

export default useQueueState