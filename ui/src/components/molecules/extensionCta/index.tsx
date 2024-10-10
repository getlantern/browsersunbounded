import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Container} from './styles'
import ExtensionButton from '../../atoms/extensionButton'
import {Text} from '../../atoms/typography'
import {useTranslation} from 'react-i18next'

interface Props {
	isSmall?: boolean
}

const ExtensionCta = ({isSmall}: Props) => {
	const {t} = useTranslation()
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
				{t('installCta')}
			</Text>
		</Container>
	)
}

export default ExtensionCta