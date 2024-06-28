import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Container} from './styles'
import ExtensionButton from '../../atoms/extensionButton'
import {Text} from '../../atoms/typography'

interface Props {
	isSmall?: boolean
}

const ExtensionCta = ({isSmall}: Props) => {
	const {settings} = useContext(AppContext)
	const {theme, menu} = settings

	if (isSmall) return <ExtensionButton isSmall={isSmall} />

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