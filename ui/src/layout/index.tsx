import {AppWrapper} from './styles'
import {AppContext} from '../context'
import useElementSize from '../hooks/useElementSize'
import {GOOGLE_FONT_LINKS} from '../constants'
import {useContext, useEffect, useLayoutEffect, useRef} from 'react'

interface Props {
	children: (JSX.Element | false)[] | JSX.Element | false
}

const Layout = ({children}: Props) => {
	const {setWidth, settings} = useContext(AppContext)
	const [ref, {width}, handleSize] = useElementSize()
	const fontLoaded = useRef(false)
	const {theme, layout, menu} = settings

	useEffect(() => setWidth(width), [width, setWidth])

	useLayoutEffect(() => {
		// Dynamically add font links to document
		// <link rel="preconnect" href="https://fonts.googleapis.com">
		// <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		// <link href="https://fonts.googleapis.com/css2?family=Urbanist&display=swap" rel="stylesheet">
		if (fontLoaded.current) return
		const addLink = ({href, rel}: {href: string, rel: string}) => {
			const link = document.createElement('link');
			link.rel = rel;
			link.href = href;
			document.getElementsByTagName('head')[0].appendChild(link);
		}
		GOOGLE_FONT_LINKS.forEach(addLink)
		fontLoaded.current = true
	}, [fontLoaded])

	useEffect(() => {
		// recalculate size on layout dynamic changes
		handleSize()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layout])

	return (
		<AppWrapper
			layout={layout}
			theme={theme}
			$menu={menu}
			ref={ref}
			id={'browsers-unbounded-app'}
		>
			{children}
		</AppWrapper>
	)
}

export default Layout