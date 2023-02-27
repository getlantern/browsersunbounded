import {Chrome, Firefox, Heart, Menu as MenuIcon, More, Twitter} from '../../atoms/icons'
import {MenuItem, MenuWrapper, StyledButton} from './styles'
import {useContext, useEffect, useRef, useState} from 'react'
import useClickOutside from '../../../hooks/useClickOutside'
import {AppContext} from '../../../context'
import {COLORS, Themes} from '../../../constants'
import {isFirefox} from '../../../utils/userAgent'

const menuItems = [
	{
		key: 'firefox',
		label: 'Install Firefox Extension',
		href: 'https://addons.mozilla.org/en-US/firefox/extensions/',
		icon: <Firefox/>
	},
	{
		key: 'chrome',
		label: 'Install Chrome Extension',
		href: 'https://chrome.google.com/webstore/category/extensions',
		icon: <Chrome/>
	},
	{
		key: 'twitter',
		label: 'Share',
		href: 'https://twitter.com',
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
const Menu = () => {
	const {theme, donate} = useContext(AppContext).settings
	const [expanded, setExpanded] = useState(false)
	const triggerRef = useRef<HTMLElement>(null)
	const ref = useRef<HTMLElement>(null)
	useClickOutside([ref, triggerRef], () => setExpanded(false))
	const [width, setWidth] = useState(0)
	const _menuItems = menuItems.filter(item => {
		if (!donate && item.key === 'donate') return false
		if (isFirefox() && item.key === 'chrome') return false
		if (!isFirefox() && item.key === 'firefox') return false
		return true
	})

	useEffect(() => {
		if (!ref.current) return
		setWidth(ref.current.offsetWidth)
	}, [expanded])

	return (
		<div style={{position: 'relative'}}>
			<StyledButton
				onClick={() => setExpanded(!expanded)}
				// @ts-ignore
				ref={triggerRef}
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
						left: `-${width - 8}px`,
						opacity: width ? 1 : 0
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