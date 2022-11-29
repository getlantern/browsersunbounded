import {Container} from './styles'
import {COLORS} from '../../../constants'
import {useContext} from 'react'
import {AppContext} from '../../../context'

interface Props {
	children: JSX.Element[] | JSX.Element
	borderTop?: boolean
	borderBottom?: boolean
	backgroundColor?: string
}

const Row = ({children, borderTop = false, borderBottom = true, backgroundColor = COLORS.transparent}: Props) => {
	const {theme} = useContext(AppContext)
	return (
		<Container
			borderTop={borderTop}
			borderBottom={borderBottom}
			backgroundColor={backgroundColor}
			theme={theme}
		>
			{children}
		</Container>
	)
}

export default Row