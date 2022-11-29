import {Container, Text} from './styles'
import {Bell} from '../../atoms/icons'
import {useCallback, useContext, useEffect, useRef, useState} from 'react'
import useExitIntent from '../../../hooks/useExitIntent'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {sharingEmitter} from '../../../utils/wasmInterface'
import {AppContext} from '../../../context'
import {Themes} from '../../../index'
import {COLORS} from '../../../constants'

const Toast = () => {
	const sharing = useEmitterState(sharingEmitter)
	const {theme} = useContext(AppContext)
	const [show, setShow] = useState(sharing)
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

	const toggleShow = useCallback(() => {
		if (timeout.current) clearTimeout(timeout.current)
		setShow(sharing)
		if (sharing) timeout.current = setTimeout(() => {
			setShow(false)
			timeout.current = null
		}, 4000)
	}, [sharing])

	useEffect(() => {
		toggleShow()
	}, [sharing, toggleShow])

	useExitIntent(toggleShow)

	return (
		<Container
			show={show}
			aria-hidden={!show}
			style={{
				top: show ? 0 : -10
			}}
			theme={theme}
		>
			<Bell/>
			<Text
				style={{color: theme === Themes.DARK ? COLORS.grey2 : COLORS.grey}}
			>
				Keep this site open to continue sharing your connection
			</Text>
		</Container>
	)
}

export default Toast