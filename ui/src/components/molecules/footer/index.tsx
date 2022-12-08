import {Text} from '../../atoms/typography'
import {Heart, Lantern, Twitter} from '../../atoms/icons'
import {Container, Divider, LanternLink} from './styles'
import {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT, COLORS} from '../../../constants'
import {Themes} from '../../../index'

const SPACER = 24

interface Props {
	social: boolean
	donate: boolean
}

const Footer = ({social, donate}: Props) => {
	const {width, theme} = useContext(AppContext)
	const color = theme === Themes.DARK ? COLORS.grey1 : COLORS.grey5

	return (
		<Container
			justify={width < BREAKPOINT ? 'center' : 'flex-start'}
		>
			{
				social && (
					<>
						<a
							href={'https://twitter.com/getlantern'}
							target={'_blank'}
							rel={'noreferrer'}
						>
							<Twitter/>
						</a>
						<Divider
							style={{marginRight: SPACER, marginLeft: SPACER}}
							theme={theme}
						/>
					</>

				)
			}
			<LanternLink
				href={'https://lantern.io/' + (donate ? 'donate' : '')}
				target={'_blank'}
				rel={'noreferrer'}
				style={{color}}
			>
				{!donate && <Text>Made with</Text>}
				<Heart/>
				<Text>{donate ? 'Donate to Lantern' : 'by'}</Text>
				<Lantern/>
			</LanternLink>
		</Container>
	)
}

export default Footer