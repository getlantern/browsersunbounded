import {Body, BodyWrapper, Container, Header, HeaderWrapper, Item} from './styles'
import {Logo} from '../../atoms/icons'
import Control from '../../molecules/control'
import React, {useContext, useState} from 'react'
import {Settings, Themes} from '../../../index'
import Col from '../../atoms/col'
import Globe from '../../molecules/globe'
import Row from '../../atoms/row'
import {BREAKPOINT, COLORS} from '../../../constants'
import Stats, {Connections} from '../../molecules/stats'
import About from '../../molecules/about'
import Footer from '../../molecules/footer'
import {AppContext} from '../../../context'
import {useLatch} from '../../../hooks/useLatch'
import ExpandCollapse from '../../atoms/expandCollapse'

interface Props {
	settings: Settings
}

const Banner = ({settings}: Props) => {
	const {width} = useContext(AppContext)
	const [expanded, setExpanded] = useState(false)
	const interacted = useLatch(expanded)
	const onToggle = (share: boolean) => !interacted && share ? setExpanded(share) : null
	return (
		<Container
			theme={settings.theme}
		>
			<HeaderWrapper>
				<Header>
					<Logo/>
					{
						!expanded && width > 650 && (
							<Item
								style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.transparent}}
								theme={settings.theme}
							>
								<Control
									onToggle={onToggle}
								/>
							</Item>
						)
					}
					{
						!expanded && width > 900 && (
							<Item
								theme={settings.theme}
							>
								<Connections/>
							</Item>
						)
					}
					{
						!expanded && width > 1150 && (
							<Footer
								social={false}
							/>
						)
					}
					<ExpandCollapse
						expanded={expanded}
						setExpanded={setExpanded}
					/>
				</Header>
				{
					!expanded && width <= 650 && (
						<Item
							style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.transparent}}
							theme={settings.theme}
						>
							<Control
								onToggle={onToggle}
							/>
						</Item>
					)
				}
			</HeaderWrapper>
			{
				expanded && (
					<BodyWrapper>
						<Body
							mobile={width < BREAKPOINT}
						>
							{
								settings.features.globe && (
									<Col>
										<Globe/>
									</Col>
								)
							}
							<Col>
								<Row
									borderTop
									borderBottom
									backgroundColor={settings.theme === Themes.DARK ? COLORS.transparent : COLORS.white}
								>
									<Control/>
								</Row>
								<Stats/>
								<About/>
								<Footer
									social={true}
								/>
							</Col>
						</Body>
					</BodyWrapper>
				)
			}
		</Container>
	)
}

export default Banner