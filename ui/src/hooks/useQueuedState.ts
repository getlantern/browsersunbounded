import {useState, useRef, useEffect} from 'react'

export const useQueueState = <T>(propState: T) => {
	const [state, setState] = useState<T>(propState)
	const updatesQueue = useRef<T[]>([])

	useEffect(() => {
		if (JSON.stringify(propState) !== JSON.stringify(state)) {
			updatesQueue.current.push(propState)
		}
	}, [propState])

	useEffect(() => {
		const processQueue = () => {
			if (updatesQueue.current.length) setState(updatesQueue.current.shift() as T)
		}

		const intervalId = setInterval(processQueue, 1000)

		return () => {
			clearInterval(intervalId)
		}
	}, [])

	return state
}