import {Container} from './styles'
import useMousePosition from '../../../hooks/useMousePosition'
import {RefObject, useEffect, useState} from 'react'

interface Props {
	text: string | null
	show: boolean
	container: RefObject<Document>
}

const ToolTip = ({text, show, container}: Props) => {
	const [_text, _setText] = useState(text)
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
			style={{
				position: 'absolute',
				top: pos.y - 10,
				left: pos.x - 10,
			}}
			show={show}
			aria-hidden={!show}
		>
			{_text}
		</Container>
	)
}

export default ToolTip