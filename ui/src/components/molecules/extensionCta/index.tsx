import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Container} from './styles'
import ExtensionButton from '../../atoms/extensionButton'
import {Text} from '../../atoms/typography'

const ExtensionCta = () => {
	const {settings} = useContext(AppContext)
	const {theme, menu} = settings

	return (
		<Container
			theme={theme}
			$menu={menu}
		>
			<ExtensionButton />
			<Text
				style={{
					fontSize: 14,
					lineHeight: '20px'
				}}
			>
				Help even more people by installing the extension
			</Text>
		</Container>
	)
}

export default ExtensionCta