import {Text} from '../../atoms/typography'
import {Heart, Lantern, Twitter} from '../../atoms/icons'
import {Container, Divider, DonateLink} from './styles'
import {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT, COLORS} from '../../../constants'
import {Themes} from '../../../index'

const SPACER = 24

interface Props {
	social: boolean
}

const Footer = ({social}: Props) => {
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
			<DonateLink
				href={'https://lantern.io'}
				target={'_blank'}
				rel={'noreferrer'}
				style={{color}}
			>
				<Heart/>
				<Text>Donate to Lantern</Text>
				<Lantern/>
			</DonateLink>
		</Container>
	)
}

export default Footer