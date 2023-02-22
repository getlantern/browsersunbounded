import {Container, Text} from './styles'
import {Bell} from '../../atoms/icons'
import {useCallback, useContext, useEffect, useRef, useState} from 'react'
import useExitIntent from '../../../hooks/useExitIntent'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {sharingEmitter} from '../../../utils/wasmInterface'
import {AppContext} from '../../../context'
import {COLORS, Targets, Themes} from '../../../constants'

const Toast = () => {
	const {exit, target} = useContext(AppContext).settings
	const sharing = useEmitterState(sharingEmitter)
	const {theme} = useContext(AppContext).settings
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
		if (target === Targets.EXTENSION_POPUP) return // disable toast on extension popup
		toggleShow()
	}, [sharing, toggleShow, target])

	useExitIntent(exit ? toggleShow : () => null)

	return (
		<Container
			show={show}
			aria-hidden={!show}
			style={{
				top: show ? 0 : -10
			}}
			theme={theme}
			onTouchStart={() => setShow(false)}
			onMouseDown={() => setShow(false)}
			onClick={() => setShow(false)}
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