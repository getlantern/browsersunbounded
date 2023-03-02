import {Text} from './styles'
import {useContext, CSSProperties} from 'react'
import {AppContext} from '../../../context'
import {COLORS, Themes} from '../../../constants'

interface Props {
	style?: CSSProperties
}

const Title = ({style = {}}: Props) => {
	const {theme} = useContext(AppContext).settings
	const color = theme === Themes.DARK ? COLORS.grey2 : COLORS.blue5
	return(
		<Text
			style={{color, margin: 0, ...style}}
		>
			{'Use your internet connection to fight censorship'}
		</Text>
	)
}

export default Title