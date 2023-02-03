import {useEffect, useState} from 'react'
import {StateEmitter} from './useStateEmitter'

const useSample = <T>({emitter, ms}: { emitter: StateEmitter<T>, ms: number }) => {
	const [sample, setSample] = useState<T>(emitter.state)

	useEffect(() => {
		const interval = setInterval(() => setSample(emitter.state), ms)
		return () => clearInterval(interval)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ms])

	return sample
}

export default useSample