import {Text} from '../../atoms/typography'
import Switch from '../../atoms/switch'
import Row from '../../atoms/row'
import {COLORS} from '../../../constants'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {readyEmitter} from '../../../utils/wasmInterface'

interface Props {
	isSharing: boolean
	onShare: (s: boolean) => void
}

const Control = ({isSharing, onShare}: Props) => {
	const ready = useEmitterState(readyEmitter)
	return (
		<>
			<Text
				style={{minWidth: 150}}
			>
				Connection sharing is {isSharing ? 'on' : 'off'}
			</Text>
			<Switch
				onToggle={onShare}
				checked={isSharing}
				disabled={!ready}
			/>
		</>
	)
	return (
		<Row
			borderTop
			borderBottom
			backgroundColor={COLORS.white}
		>
			<Text>Connection sharing is {isSharing ? 'on' : 'off'}</Text>
			<Switch
				onToggle={onShare}
				checked={isSharing}
				disabled={!ready}
			/>
		</Row>
	)
}

export default Control