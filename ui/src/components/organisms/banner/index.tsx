import {Body, BodyWrapper, Container, Header, HeaderRight, HeaderWrapper, Item} from './styles'
import {LogoLeft} from '../../atoms/icons'
import Control from '../../molecules/control'
import Menu from '../../molecules/menu'
import React, {useContext, useState, lazy, Suspense, useEffect} from 'react'
import Col from '../../atoms/col'
import GlobeSuspense from '../../molecules/globe/suspense'
import Row from '../../atoms/row'
import {BREAKPOINT, COLORS, Themes} from '../../../constants'
import Stats, {Connections} from '../../molecules/stats'
import About from '../../molecules/about'
// import Footer from '../../molecules/footer'
import {AppContext} from '../../../context'
import {useLatch} from '../../../hooks/useLatch'
import ExpandCollapse from '../../atoms/expandCollapse'

const Globe = lazy(() => import('../../molecules/globe'))


const Banner = () => {
	const {width, settings} = useContext(AppContext)
	const [expanded, setExpanded] = useState(!settings.collapse)
	const interacted = useLatch(expanded)
	const onToggle = (share: boolean) => !interacted && share ? setExpanded(share) : null
	useEffect(() => setExpanded(!settings.collapse), [settings.collapse]) // hydrate on settings change
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
					{ settings.branding ? <LogoLeft /> : <div /> }
					{
						!expanded && width > 650 && (
							<Item
								style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.grey6}}
								theme={settings.theme}
							>
								<Control
									onToggle={onToggle}
									info
								/>
							</Item>
						)
					}
					{
						!expanded && width > 1000 && (
							<Item
								theme={settings.theme}
							>
								<Connections/>
							</Item>
						)
					}
					<HeaderRight>
						<Menu />
						{
							settings.collapse && (
								<ExpandCollapse
									expanded={expanded}
									setExpanded={setExpanded}
								/>
							)
						}
					</HeaderRight>
				</Header>
				{
					!expanded && width <= 650 && (
						<Item
							style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.grey6}}
							theme={settings.theme}
						>
							<Control
								info
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
							padding: width > BREAKPOINT ? '24px 32px' : settings.globe ? '0 16px 24px' : '24px 16px'
						}}
					>
						<Body
							mobile={width < BREAKPOINT}
						>
							{
								settings.globe && (
									<Col>
										<Suspense fallback={<GlobeSuspense />}>
											<Globe target={settings.target}/>
										</Suspense>
									</Col>
								)
							}
							<Col>
								<div
									style={{marginBottom: 24}}
								>
									<About/>
								</div>
								<Row
									borderTop
									borderBottom
									backgroundColor={settings.theme === Themes.DARK ? COLORS.grey6 : COLORS.white}
								>
									<Control
										onToggle={onToggle}
									/>
								</Row>
								<Stats/>
								<div
									style={{width: '100%', height: width > BREAKPOINT ? 80 : 24}}
								/>
								{/*<div*/}
								{/*	style={{paddingLeft: 8, paddingRight: 8}}*/}
								{/*>*/}
									{/*<Footer*/}
									{/*	social={true}*/}
									{/*	donate={settings.donate}*/}
									{/*/>*/}
								{/*</div>*/}
							</Col>
						</Body>
					</BodyWrapper>
				)
			}
		</Container>
	)
}

export default Banner