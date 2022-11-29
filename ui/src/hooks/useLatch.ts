import {useEffect, useRef} from 'react'
import {usePrevious} from './usePrevious'

export const useLatch = <T>(value: T) => {
	const prev = usePrevious(value)
	const latch = useRef<T | null>()
	useEffect(() => {
		if (latch.current) return
		if (value !== prev) latch.current = value
	}, [value, prev, latch])
	return latch.current
}