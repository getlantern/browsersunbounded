import {Container} from './styles'
import useMousePosition from '../../../hooks/useMousePosition'
import {RefObject, useEffect, useState} from 'react'
import useElementSize from '../../../hooks/useElementSize'
interface Props {
	text: string | null
	show: boolean
	container: RefObject<Document>
}
const Tip = ({text, show, container}: Props) => {
	const [_text, _setText] = useState(text)
	const [ref, { width }] = useElementSize()
	const currentPos = useMousePosition(container)
	const [pos, setPos] = useState(currentPos)

	useEffect(() => {
		if (show) setPos(currentPos)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show])

	useEffect(() => {
		if (text) _setText(text)
	}, [text])

	return (
		<Container
			ref={ref}
			style={{
				position: 'absolute',
				top: pos.y + 15,
				left: pos.x - (width / 2)
			}}
			show={show}
			aria-hidden={!show}
		>
			{_text}
		</Container>
	)
}

export default Tip