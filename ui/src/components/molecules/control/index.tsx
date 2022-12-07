import {Text} from '../../atoms/typography'
import Switch from '../../atoms/switch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {readyEmitter, sharingEmitter, wasmInterface} from '../../../utils/wasmInterface'
import Info from '../info'
import {TextInfo} from './styles'
import {ConnectionTypes, useConnectionType} from '../../../hooks/useConnectionType'
import {useEffect} from 'react'
import {isMobile} from '../../../utils/isMobile'

interface Props {
	onToggle?: (s: boolean) => void
}

const Control = ({onToggle}: Props) => {
	const ready = useEmitterState(readyEmitter)
	const sharing = useEmitterState(sharingEmitter)
	const connectionType = useConnectionType(sharing) // subscribe to connection type for users in sharing state

	useEffect(() => {
		if (isMobile || connectionType === ConnectionTypes.SLOW) {
			// @todo design for connection/data warnings
		}
	}, [connectionType])

	const _onToggle = (share: boolean) => {
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
				<Info />
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