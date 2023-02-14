import {Text} from '../../atoms/typography'
import Switch from '../../atoms/switch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {readyEmitter, sharingEmitter, wasmInterface} from '../../../utils/wasmInterface'
import Info from '../info'
import {TextInfo} from './styles'

interface Props {
	onToggle?: (s: boolean) => void
	info?: boolean
}

const Control = ({onToggle, info = false}: Props) => {
	const ready = useEmitterState(readyEmitter)
	const sharing = useEmitterState(sharingEmitter)

	const _onToggle = (share: boolean) => {
		if (share && process.env.REACT_APP_TARGET === 'chrome') {
			// @ts-ignore
			chrome.runtime.sendMessage('start')
		}
		if (share) wasmInterface.start()
		if (!share) wasmInterface.stop()
		if (onToggle) onToggle(share)
	}
	return (
		<>
			<TextInfo>
				<Text
					style={{minWidth: 160}}
				>
					Connection sharing is {sharing ? 'ON' : 'OFF'}
				</Text>
				{ info && <Info /> }
			</TextInfo>
			<Switch
				onToggle={_onToggle}
				checked={sharing}
				disabled={!ready}
			/>
		</>
	)
}

export default Control