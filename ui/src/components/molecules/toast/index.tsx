import {Container, Text} from './styles'
import Bell from './bell'
import {useCallback, useEffect, useRef, useState} from 'react'
import useExitIntent from '../../../hooks/useExitIntent'

interface Props {
	isSharing: boolean
}

const Toast = ({isSharing}: Props) => {
	const [show, setShow] = useState(isSharing)
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

	const toggleShow = useCallback(() => {
		if (timeout.current) clearTimeout(timeout.current)
		setShow(isSharing)
		if (isSharing) timeout.current = setTimeout(() => {
			setShow(false)
			timeout.current = null
		}, 4000)
	}, [isSharing])

	useEffect(() => {
		toggleShow()
	}, [isSharing, toggleShow])

	useExitIntent(toggleShow)

	return (
		<Container
			show={show}
			aria-hidden={!show}
			style={{
				top: show ? 0 : -10,
			}}
		>
			<Bell />
			<Text>Keep this site open to continue sharing your connection</Text>
		</Container>
	)
}

export default Toast