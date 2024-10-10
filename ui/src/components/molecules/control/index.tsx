import {Text} from '../../atoms/typography'
import Switch from '../../atoms/switch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {readyEmitter, sharingEmitter} from '../../../utils/wasmInterface'
import Info from '../info'
import {TextInfo} from './styles'
import {useContext, useState} from 'react'
import {AppContext} from '../../../context'
import {COLORS, Layouts, Targets} from '../../../constants'
import {tutorialOnEmitter} from '../../atoms/tutorial'
import {useTranslation} from 'react-i18next'

interface Props {
	onToggle?: (s: boolean) => void
	info?: boolean
}

const Control = ({onToggle, info = false}: Props) => {
	const {t} = useTranslation()
	const ready = useEmitterState(readyEmitter) // true
	const sharing = useEmitterState(sharingEmitter)
	const {wasmInterface, settings} = useContext(AppContext)
	const {mock, target, layout} = settings
	// on web, we don't need to initialize wasm until user starts sharing
	const needsInit = target === Targets.WEB && !wasmInterface?.instance
	const [loading, setLoading] = useState(false)

	const init = async () => {
		console.log(`wasmInterface: ${wasmInterface}`)
		if (!wasmInterface) return
		setLoading(true)
		console.log(`initializing p2p ${mock ? '"wasm"' : 'wasm'}`)
		const instance = await wasmInterface.initialize({mock, target})
		if (!instance) return console.warn('wasm failed to initialize')
		console.log(`p2p ${mock ? '"wasm"' : 'wasm'} initialized!`)
		setLoading(false)
	}

	const _onToggle = async (share: boolean) => {
		if (needsInit) await init()
		if (share) {
			wasmInterface.start()
			tutorialOnEmitter.update(false)
		}
		if (!share) wasmInterface.stop()
		if (onToggle) onToggle(share)
	}

	return (
		<>
			<TextInfo>
				<Text
					style={{minWidth: 90, fontWeight: 'bold', fontSize: layout === Layouts.BANNER ? 14 : 12}}
				>
					{t('status')} <span style={{color: sharing ? COLORS.green : COLORS.error}}>{sharing ? t('on') : t('off')}</span>
				</Text>
				{ info && <Info /> }
			</TextInfo>
			<Switch
				onToggle={_onToggle}
				checked={sharing}
				disabled={!ready && !needsInit}
				loading={loading}
			/>
		</>
	)
}

export default Control
