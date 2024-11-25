import {Container} from './styles'
import {cloneElement, ReactElement, ReactNode, useContext} from 'react'
import {AppContext} from '../../../context'
import {useTranslation} from 'react-i18next'

const Heart = () => (
	<svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M12 22.2258L10.55 20.9058C5.4 16.2358 2 13.1458 2 9.37578C2 6.28578 4.42 3.87578 7.5 3.87578C9.24 3.87578 10.91 4.68578 12 5.95578C13.09 4.68578 14.76 3.87578 16.5 3.87578C19.58 3.87578 22 6.28578 22 9.37578C22 13.1458 18.6 16.2358 13.45 20.9058L12 22.2258Z"
			fill="#FE0000"/>
	</svg>
)

const translateWithComponents = (
	template: string,
	components: Record<string, ReactNode>
): ReactNode[] => {
	const regex = /{{(.*?)}}/g

	const parts = template.split(regex)

	return parts.map((part, index) => {
		if (components[part]) {
			return cloneElement(components[part] as ReactElement, { key: index })
		}
		return part
	});
};

const Love = () => {
	const {settings} = useContext(AppContext)
	const {theme} = settings
	const {t} = useTranslation()

	const str: string = t('love')
	const components: Record<string, ReactNode> = {
		love: <Heart />,
		lantern: (
			<a href="https://lantern.io" target="_blank" rel="noopener">
				Lantern
			</a>
		),
	};

	return (
		<Container theme={theme}>
			{translateWithComponents(str, components)}
		</Container>
	)
}

export default Love;