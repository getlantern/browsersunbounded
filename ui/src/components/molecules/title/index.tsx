import {Text} from './styles'
import {useContext, CSSProperties} from 'react'
import {AppContext} from '../../../context'
import {COLORS, Themes} from '../../../constants'
import {useTranslation} from 'react-i18next'

interface Props {
	style?: CSSProperties
}

const Title = ({style = {}}: Props) => {
	const { t } = useTranslation();
	const {theme} = useContext(AppContext).settings
	const color = theme === Themes.DARK ? COLORS.grey2 : COLORS.blue5
	return(
		<Text
			style={{color, margin: 0, ...style}}
		>
			{t('title')}
		</Text>
	)
}

export default Title