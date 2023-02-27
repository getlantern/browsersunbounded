import {RefObject, useCallback} from 'react'
import useEventListener from './useEventListener'

const useClickOutside = <T extends HTMLElement>(refs: RefObject<T>[], fn: () => void) => {
	const handle = useCallback((event: Event) => {
		let inside = false
		refs.forEach(ref => {
			if (ref?.current && ref?.current.contains(event.target as Node | null)) inside = true
		})
		if (!inside) fn()
	}, [refs, fn])
	useEventListener('mousedown', handle)
};

export default useClickOutside