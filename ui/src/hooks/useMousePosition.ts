import {RefObject, useState} from 'react'
import useEventListener from './useEventListener'

const useMousePosition = (element: RefObject<Document>) => {
	const [mousePosition, setMousePosition] = useState({x: 0, y: 0})

	const updateMousePosition = (e: MouseEvent) => {
		setMousePosition({x: e.offsetX, y: e.offsetY})
	}

	useEventListener('mousemove', updateMousePosition, element)

	return mousePosition
}
export default useMousePosition