import styled from 'styled-components'
import {COLORS, Themes} from '../../../constants'

export const Container = styled.div`
	display: flex;
	flex-direction: row;
	gap: 8px;
	width: 100%;
	justify-content: center;
	align-items: center;

	color: ${({theme}) => theme === Themes.DARK ? COLORS.grey3 : COLORS.black};
	font-size: 14px;
	font-style: normal;
	font-weight: 400;
	line-height: 28px;
		
	a {
			color: ${({theme}) => theme === Themes.DARK ? COLORS.grey3 : COLORS.black};
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 28px;
	}
`;