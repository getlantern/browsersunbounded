import {Container} from './styles'
import {COLORS} from '../../../constants'

interface Props {
	children: JSX.Element[] | JSX.Element
	borderTop?: boolean
	borderBottom?: boolean
	backgroundColor?: string
}

const Row = ({children, borderTop = false, borderBottom = true, backgroundColor = COLORS.transparent}: Props) => {
	return (
		<Container
			borderTop={borderTop}
			borderBottom={borderBottom}
			backgroundColor={backgroundColor}
		>
			{children}
		</Container>
	)
}

export default Row