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
			<HeaderWrapper
				style={{
					padding: width > BREAKPOINT ? '8px 32px' : '8px 16px'
				}}
			>
				<Header>
					<Logo/>
					{
						!expanded && width > 650 && (
							<Item
								style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.grey6}}
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
							style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.grey6}}
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
					<BodyWrapper
						style={{
							padding: width > BREAKPOINT ? '24px 32px' : '24px 16px'
						}}
					>
						<Body
							mobile={width < BREAKPOINT}
						>
							{
								settings.globe && (
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
									<Control/>
								</Row>
								<Stats/>
								<div
									style={{margin: '24px 0'}}
								>
									<About/>
								</div>
								<div
									style={{paddingLeft: 8, paddingRight: 8}}
								>
									<Footer
										social={true}
									/>
								</div>
							</Col>
						</Body>
					</BodyWrapper>
				)
			}
		</Container>
	)
}

export default Banner