import {Text} from '../../atoms/typography'
import Switch from '../../atoms/switch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {readyEmitter, sharingEmitter} from '../../../utils/wasmInterface'
import Info from '../info'
import {TextInfo} from './styles'
import {useContext} from 'react'
import {AppContext} from '../../../context'
import {COLORS} from '../../../constants'

interface Props {
	onToggle?: (s: boolean) => void
	info?: boolean
}

const Control = ({onToggle, info = false}: Props) => {
	const ready = useEmitterState(readyEmitter)
	const sharing = useEmitterState(sharingEmitter)
	const {wasmInterface} = useContext(AppContext)

	const _onToggle = (share: boolean) => {
		if (share) wasmInterface.start()
		if (!share) wasmInterface.stop()
		if (onToggle) onToggle(share)
	}
	return (
		<>
			<TextInfo>
				<Text
					style={{minWidth: 160, fontWeight: 'bold'}}
				>
					Connection sharing: <span style={{color: sharing ? COLORS.green : COLORS.error}}>{sharing ? 'ON' : 'OFF'}</span>
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