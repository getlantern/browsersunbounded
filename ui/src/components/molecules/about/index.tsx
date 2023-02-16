import {Text} from './styles'
import {useContext, CSSProperties} from 'react'
import {AppContext} from '../../../context'
import {Themes} from '../../../index'
import {COLORS} from '../../../constants'

interface Props {
	style?: CSSProperties
}

const About = ({style = {}}: Props) => {
	const {theme} = useContext(AppContext)
	const color = theme === Themes.DARK ? COLORS.grey2 : COLORS.blue5
	const brand = theme === Themes.DARK ? COLORS.altBrand : COLORS.brand
	return(
		<Text
			style={{color, margin: 0, ...style}}
		>
			Sharing your connection enables people living with internet censorship to access the open internet using <a style={{color: brand}} href={'https://lantern.io'} target={'_blank'} rel={'noreferrer'}>Lantern</a>. Keep this site open to continue sharing your connection .
		</Text>
	)
}

export default About