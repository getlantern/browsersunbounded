import {Dispatch, SetStateAction, useLayoutEffect, useState} from 'react'

export class StateEmitter<T> {
	state: T
	listeners: Dispatch<SetStateAction<T>>[]
	constructor(state: T) {
		this.listeners = []
		this.state = state
	}

	on = (cb: Dispatch<SetStateAction<T>>) => this.listeners.push(cb)
	off = (cb: Dispatch<SetStateAction<T>>) => this.listeners = this.listeners.filter(fn => fn !== cb)
	update = (state: T) => {
		if (this.state === state) return
		this.state = state
		this.listeners.forEach(cb => cb(state))
	}
}

export const useEmitterState = <T>(bus: StateEmitter<T>) => {
	const [state, setState] = useState<T>(bus.state)
	useLayoutEffect(() => {
		bus.on(setState)
		return () => {
			bus.off(setState)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
	return state
}