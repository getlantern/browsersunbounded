import {Text} from '../../atoms/typography'
import {Github, Lantern, Twitter} from '../../atoms/icons'
import {Container, Divider} from './styles'
import {useContext} from 'react'
import {AppWidth} from '../../../context'
import {BREAKPOINT} from '../../../constants'

const SPACER = 24;

const Footer = () => {
	const {width} = useContext(AppWidth)

	return (
		<Container
			justify={width < BREAKPOINT ? 'center' : 'flex-start'}
		>
			<a
				href={'https://twitter.com/getlantern'}
				target={'_blank'}
				rel={'noreferrer'}
			>
				<Twitter />
			</a>
			<a
				href={'https://github.com/getlantern'}
				target={'_blank'}
				rel={'noreferrer'}
				style={{marginLeft: SPACER, marginRight: SPACER}}
			>
				<Github />
			</a>
			<Divider />
			<a
				href={'https://lantern.io'}
				target={'_blank'}
				rel={'noreferrer'}
				style={{marginLeft: SPACER}}
			>
				<Lantern />
			</a>
			<Text
				style={{marginLeft: SPACER}}
			>
				Built with ❤️ by <a href={'https://lantern.io'} target={'_blank'} rel={'noreferrer'}>Lantern</a>
			</Text>
		</Container>
	)
}

export default Footer