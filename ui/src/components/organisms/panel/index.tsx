import {Container, Body, BodyWrapper, ExpandWrapper} from './styles'
import React, {useContext, useState} from 'react'
import {AppContext} from '../../../context'
import {Settings, Themes} from '../../../index'
import {BREAKPOINT, COLORS} from '../../../constants'
import Col from '../../atoms/col'
import Globe from '../../molecules/globe'
import Row from '../../atoms/row'
import Control from '../../molecules/control'
import Stats, {Connections} from '../../molecules/stats'
import About from '../../molecules/about'
import Footer from '../../molecules/footer'
import {Logo} from '../../atoms/icons'
import {ExpandCollapsePanel} from '../../atoms/expandCollapse'
import {useLatch} from '../../../hooks/useLatch'

interface Props {
	settings: Settings
}

const Panel = ({settings}: Props) => {
	const {theme, width} = useContext(AppContext)
	const [expanded, setExpanded] = useState(false)
	const interacted = useLatch(expanded)
	const onToggle = (share: boolean) => !interacted && share ? setExpanded(share) : null

	return (
		<Container
			theme={theme}
		>
			<BodyWrapper
				style={{
					padding: width > BREAKPOINT ? '24px 32px' : '24px 16px'
				}}
			>
				<Body
					mobile={width < BREAKPOINT}
				>
					<Logo/>
					<About/>
					{
						settings.globe && expanded && (
							<Col>
								<Globe/>
							</Col>
						)
					}
					<Col>
						<Row
							borderTop
							borderBottom
							backgroundColor={settings.theme === Themes.DARK ? COLORS.grey6 : COLORS.white}
						>
							<Control
								onToggle={onToggle}
							/>
						</Row>
						{
							!expanded && (
								<Row
									borderBottom
								>
									<Connections />
								</Row>
							)
						}
						{
							expanded && (
								<Stats />
							)
						}
						<div
							style={{paddingLeft: 8, paddingRight: 8, margin: '24px 0'}}
						>
							<Footer
								social={false}
								donate={settings.donate}
							/>
						</div>
						<ExpandWrapper
							style={{margin: '24px 0 0'}}
						>
							<ExpandCollapsePanel
								expanded={expanded}
								setExpanded={setExpanded}
							/>
						</ExpandWrapper>
					</Col>
				</Body>
			</BodyWrapper>
		</Container>
	)
}

export default Panel