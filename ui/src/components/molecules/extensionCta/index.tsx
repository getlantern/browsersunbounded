import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Container} from './styles'
import ExtensionButton from '../../atoms/extensionButton'
import {Text} from '../../atoms/typography'

const ExtensionCta = () => {
	const {settings} = useContext(AppContext)
	const {theme} = settings

	return (
		<Container
			theme={theme}
		>
			<ExtensionButton />
			<Text
				style={{
					fontSize: 12,
					lineHeight: '20px'
				}}
			>
				Help more people by installing our extension.
			</Text>
		</Container>
	)
}

export default ExtensionCta