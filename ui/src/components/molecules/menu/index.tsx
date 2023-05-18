import {Chrome, Firefox, Heart, Menu as MenuIcon, More, Twitter} from '../../atoms/icons'
import {MenuItem, MenuWrapper, StyledButton} from './styles'
import {Dispatch, SetStateAction, useContext, useEffect, useRef, useState} from 'react'
import useClickOutside from '../../../hooks/useClickOutside'
import {AppContext} from '../../../context'
import {COLORS, Layouts, Targets, Themes} from '../../../constants'
import {isFirefox} from '../../../utils/userAgent'
import {connectedTwitterLink} from '../../../utils/share'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {lifetimeConnectionsEmitter} from '../../../utils/wasmInterface'
import {humanizeCount} from '../../../utils/humanize'

const menuItems = (connected: number | string) => [
	{
		key: 'firefox',
		label: 'Install Firefox Extension',
		href: 'https://addons.mozilla.org/en-US/firefox/addon/lantern-network/',
		icon: <Firefox/>
	},
	{
		key: 'chrome',
		label: 'Install Chrome Extension',
		href: 'https://chrome.google.com/webstore/detail/lantern-network/jonhnkjdlimggpmbehgkgpjgphoepfdj/',
		icon: <Chrome/>
	},
	{
		key: 'twitter',
		label: 'Share',
		href: connectedTwitterLink(connected),
		icon: <Twitter/>
	},
	{
		key: 'donate',
		label: 'Donate to Lantern',
		href: 'https://lantern.io/donate',
		icon: <Heart/>
	},
	{
		key: 'more',
		label: 'Learn More',
		href: 'https://network.lantern.io',
		icon: <More/>
	}
]

interface MenuProps {
	setExpanded?: Dispatch<SetStateAction<boolean>> | null
}
const Menu = ({setExpanded} : MenuProps) => {
	const {settings, width} = useContext(AppContext)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	const {theme, layout, target, collapse} = settings
	const [expanded, _setExpanded] = useState(false)
	const triggerRef = useRef<HTMLElement>(null)
	const ref = useRef<HTMLElement>(null)
	useClickOutside([ref, triggerRef], () => _setExpanded(false))
	const [_width, setWidth] = useState(0)
	const centered = width < 600 || layout !== Layouts.BANNER
	// unique case when collapse button is missing we have to compensate for margin
	const compensateMargin = !collapse || layout === Layouts.PANEL

	const _menuItems = menuItems(humanizeCount(lifetimeConnections)).filter(item => {
		if ((isFirefox() || target === Targets.EXTENSION_POPUP) && item.key === 'chrome') return false
		if ((!isFirefox() || target === Targets.EXTENSION_POPUP) && item.key === 'firefox') return false
		return true
	})

	useEffect(() => {
		if (!ref.current) return
		setWidth(ref.current.offsetWidth)
	}, [expanded])

	return (
		<div style={centered ? {} : {position: 'relative'}}>
			<StyledButton
				onClick={() => {
					_setExpanded(!expanded)
					if (setExpanded && !expanded) setExpanded(!expanded)
				}}
				// @ts-ignore
				ref={triggerRef}
				area-label={expanded ? 'Close menu' : 'Open menu'}
				style={compensateMargin ? {marginRight: -10} : {}}
			>
				<MenuIcon/>
			</StyledButton>
			{expanded && (
				<MenuWrapper
					// @ts-ignore
					ref={ref}
					style={{
						backgroundColor: theme === Themes.LIGHT ? COLORS.white : COLORS.grey6,
						border: `1px solid ${theme === Themes.LIGHT ? COLORS.grey2 : COLORS.grey5}`,
						boxShadow: `0 0 16px ${theme === Themes.LIGHT ? 'rgba(0, 97, 99, 0.1)' : 'rgba(0, 97, 99, 0.1)'}`,
						left: centered ? (width - _width)/2 : -(_width - 30),
						top: centered ? layout === Layouts.BANNER ? 60 : 75 : 30,
						opacity: (_width && width) ? 1 : 0, // don't show until menu and app width is calculated
						width: centered ? width - 24 : 'unset'
					}}
				>
					{_menuItems.map(item => {
						return (
							<MenuItem key={item.href}>
								<a
									href={item.href}
									target={'_blank'}
									rel={'noreferrer'}
									style={{color: theme === Themes.LIGHT ? COLORS.blue5 : COLORS.white}}
								>
									{item.icon}
									{item.label}
								</a>
							</MenuItem>
						)
					})}
				</MenuWrapper>
			)}
		</div>
	)
}

export default Menu