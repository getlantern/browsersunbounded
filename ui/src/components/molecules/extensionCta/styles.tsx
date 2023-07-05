import styled from 'styled-components'
import {COLORS, Themes} from '../../../constants'

export const Container = styled.div`
	display: flex;
	background-color: ${props => props.theme === Themes.LIGHT ? COLORS.white : COLORS.grey6};
	border: 1px solid ${COLORS.grey2};
	border-radius: 16px;
	padding: 16px;
	margin-top: 16px;
  justify-content: center;
  align-items: center;
  flex-direction: column;
	gap: 8px;
`