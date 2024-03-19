import {Container} from './styles'
import {COLORS, Layouts} from '../../../constants'
import {useContext} from 'react'
import {AppContext} from '../../../context'

interface Props {
	children: JSX.Element[] | JSX.Element
	borderTop?: boolean
	borderBottom?: boolean
	backgroundColor?: string
}

const Row = ({children, borderTop = false, borderBottom = true, backgroundColor = COLORS.transparent}: Props) => {
	const {theme, menu, layout} = useContext(AppContext).settings
	return (
		<Container
			borderTop={borderTop}
			borderBottom={borderBottom}
			backgroundColor={backgroundColor}
			theme={theme}
			style={layout !== Layouts.BANNER ? {height: 48} : {height: 60}}
		>
			{children}
		</Container>
	)
}

export default Row