import {Text} from './styles'
import {useContext, CSSProperties} from 'react'
import {AppContext} from '../../../context'
import {COLORS, Themes} from '../../../constants'

interface Props {
	style?: CSSProperties
}

const About = ({style = {}}: Props) => {
	const {theme, keepText, infoLink} = useContext(AppContext).settings
	const color = theme === Themes.DARK ? COLORS.grey2 : COLORS.blue5
	return(
		<Text
			style={{color, margin: 0, ...style}}
		>
			{'Join our network of digital volunteers and help unblock the internet around the world.'}
			{/*<a style={{color: brand}} href={'https://lantern.io'} target={'_blank'} rel={'noreferrer'}>Lantern</a>.*/}
			{ !!keepText && ' Keep this site open to continue sharing your connection.' }
			{ !!infoLink.length && <span dangerouslySetInnerHTML={{__html: infoLink}} />}
		</Text>
	)
}

export default About