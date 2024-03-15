import styled from 'styled-components'
import {COLORS} from '../../../constants'
import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Themes} from '../../../constants'

const StyledText = styled.p`
	&& {
    font-weight: 400;
    font-size: 14px;
    line-height: 23px;
    color: ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.grey2 : COLORS.blue5};
    padding: 0;
    margin: 0;
	}
`

const Text = (props: any) => {
	const {theme} = useContext(AppContext).settings
	return <StyledText theme={theme} {...props} />
}

export {Text}