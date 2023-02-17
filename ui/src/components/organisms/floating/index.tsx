import {Container, Body, BodyWrapper, Header, Item} from './styles'
import React, {useContext, useState, lazy, Suspense, useEffect} from 'react'
import {AppContext} from '../../../context'
import {Settings, Themes} from '../../../index'
import {BREAKPOINT, COLORS} from '../../../constants'
import Col from '../../atoms/col'
import GlobeSuspense from '../../molecules/globe/suspense'
import Row from '../../atoms/row'
import Control from '../../molecules/control'
import Stats, {Connections} from '../../molecules/stats'
import Footer from '../../molecules/footer'
import {LogoLeft} from '../../atoms/icons'
import ExpandCollapse from '../../atoms/expandCollapse'
import {useLatch} from '../../../hooks/useLatch'
import useWindowSize from '../../../hooks/useWindowSize'

const Globe = lazy(() => import('../../molecules/globe'))

interface Props {
	settings: Settings
}

const Floating = ({settings}: Props) => {
	const {theme, width} = useContext(AppContext)
	const {height} = useWindowSize()
	const [expanded, setExpanded] = useState(!settings.collapse)
	const interacted = useLatch(expanded)
	const onToggle = (share: boolean) => !interacted && share ? setExpanded(share) : null
	useEffect(() => setExpanded(!settings.collapse), [settings.collapse]) // hydrate on settings change

	return (
		<Container
			theme={theme}
		>
			<BodyWrapper
				style={{
					padding: width > BREAKPOINT ? '24px 32px' : expanded ? '24px 16px' : '8px 16px'
				}}
			>
				<Body
					mobile={width < BREAKPOINT}
				>
					<Header
						style={{
							paddingBottom: !expanded ? 8 : 0
						}}
					>
						{ settings.branding ? <LogoLeft /> : <div /> }
						{
							settings.collapse && (
								<ExpandCollapse
									expanded={expanded}
									setExpanded={setExpanded}
									carrot={true}
								/>
							)
						}
					</Header>
					{
						!expanded && (
							<Col>
								<Item
									style={{backgroundColor: settings.theme === Themes.LIGHT ? COLORS.white : COLORS.grey6}}
									theme={settings.theme}
								>
									<Control
										onToggle={onToggle}
										info
									/>
								</Item>
							</Col>
						)
					}
					{
						settings.globe && expanded && (
							<Col>
								<Suspense fallback={<GlobeSuspense/>}>
									<Globe target={settings.target}/>
								</Suspense>
							</Col>
						)
					}
					{
						expanded && (
							<Col>
								<Row
									borderTop
									borderBottom
									backgroundColor={settings.theme === Themes.DARK ? COLORS.grey6 : COLORS.white}
								>
									<Control
										onToggle={onToggle}
										info
									/>
								</Row>
								{
									expanded && (
										<>
											{ height > 650 ? <Stats/> : <Row><Connections/></Row> }
										</>
									)
								}
								<div
									style={{paddingLeft: 8, paddingRight: 8, margin: '24px 0 0'}}
								>
									<Footer
										social={false}
										donate={settings.donate}
									/>
								</div>
							</Col>
						)
					}
				</Body>
			</BodyWrapper>
		</Container>
	)
}

export default Floating