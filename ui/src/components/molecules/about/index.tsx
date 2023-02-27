import {Text} from './styles'
import {useContext, CSSProperties} from 'react'
import {AppContext} from '../../../context'
import {COLORS, Themes} from '../../../constants'

interface Props {
	style?: CSSProperties
}

const About = ({style = {}}: Props) => {
	const {theme, keepText} = useContext(AppContext).settings
	const color = theme === Themes.DARK ? COLORS.grey2 : COLORS.blue5
	// const brand = theme === Themes.DARK ? COLORS.altBrand : COLORS.brand
	return(
		<Text
			style={{color, margin: 0, ...style}}
		>
			{'Sharing your connection enables people living with censorship to access the open internet.'}
			{/*<a style={{color: brand}} href={'https://lantern.io'} target={'_blank'} rel={'noreferrer'}>Lantern</a>.*/}
			{ keepText && ' Keep this site open to continue sharing your connection.' }
		</Text>
	)
}

export default About