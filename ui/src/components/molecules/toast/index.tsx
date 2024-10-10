import {Container, Text} from './styles'
import {Bell} from '../../atoms/icons'
import {useCallback, useContext, useEffect, useRef, useState} from 'react'
import useExitIntent from '../../../hooks/useExitIntent'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {sharingEmitter} from '../../../utils/wasmInterface'
import {AppContext} from '../../../context'
import {COLORS, Layouts, Targets, Themes} from '../../../constants'
import {useTranslation} from 'react-i18next'

const Toast = () => {
	const {t} = useTranslation()
	const {exit, target, toast} = useContext(AppContext).settings
	const sharing = useEmitterState(sharingEmitter)
	const {theme, layout} = useContext(AppContext).settings
	const [show, setShow] = useState(toast && sharing)
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
		if (!toast) return // disable toast if toast is disabled
		if (target === Targets.EXTENSION_POPUP) return // disable toast on extension popup
		toggleShow()
	}, [toast, sharing, toggleShow, target])

	useExitIntent(exit ? toggleShow : () => null)

	const top = show ? 0 : -10
	const bannerStyle = {
		left: 0,
		right: 'unset',
		top: top,
	}

	return (
		<Container
			show={show}
			aria-hidden={!show}
			style={layout === Layouts.BANNER ? bannerStyle : {top}}
			theme={theme}
			onTouchStart={() => setShow(false)}
			onMouseDown={() => setShow(false)}
			onClick={() => setShow(false)}
		>
			<Bell/>
			<Text
				style={{color: theme === Themes.LIGHT ? COLORS.grey2 : COLORS.grey2}}
			>
				{t('keep')}
			</Text>
		</Container>
	)
}

export default Toast