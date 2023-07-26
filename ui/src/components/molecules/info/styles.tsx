import styled from 'styled-components'
import {COLORS, SHADOWS, Themes} from '../../../constants'

export const StyledButton = styled.button`
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  cursor: pointer;
  padding: 0;
`

export const Wrapper = styled.div`
  z-index: 2147483647; // 2147483647 is largest positive value of a signed integer on a 32 bit system
  box-shadow: ${({theme}: {theme: Themes}) => theme === Themes.DARK ? SHADOWS.dark : SHADOWS.light};
  padding: 8px 24px;
	background-color: ${({theme}: {theme: Themes}) => theme === Themes.DARK ? COLORS.grey6 : COLORS.grey1};
	border-radius: 30px;
	max-width: 600px;
  font-family: 'Urbanist', sans-serif;
	margin: 11px;
	a {
		color: ${({theme}: {theme: Themes}) => theme === Themes.DARK ? COLORS.altBrand : COLORS.brand};
	}
`

export const LinkWrapper = styled.span`
  margin-left: 8px;
  a {
    color: ${COLORS.blue4};
    text-decoration: underline;
  }
`