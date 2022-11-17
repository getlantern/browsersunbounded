import {Text} from '../../atoms/typography'
import Switch from '../../atoms/switch'
import Row from '../../atoms/row'
import {COLORS} from '../../../constants'

interface Props {
	isSharing: boolean
	onShare: (s: boolean) => void
}

const Control = ({isSharing, onShare}: Props) => {
	return (
		<Row
			borderTop
			borderBottom
			backgroundColor={COLORS.white}
		>
			<Text>Connection sharing is {isSharing ? 'on' : 'off'}</Text>
			<Switch onToggle={onShare} checked={isSharing} />
		</Row>
	)
}

export default Control