import styled from 'styled-components'
import {COLORS, MAX_WIDTH} from '../../../constants'
import {Themes} from '../../../index'

export const Container = styled.div`
  border: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.white : COLORS.grey2};
  width: 100%;
	flex-shrink: 0;
	flex-direction: column;
`

export const HeaderWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
	height: 32px;
	a {
		outline: none;
		cursor: pointer;
	}
`

export const BodyWrapper = styled.div`
  display: flex;
	justify-content: center;
	align-items: center;
`

export const Body = styled.div`
  display: flex;
  width: 100%;
  gap: 48px;
  max-width: ${MAX_WIDTH}px;
  flex-direction: ${(props: {mobile: boolean}) => props.mobile ? 'column' : 'row'};
`

export const Item = styled.div`
	display: flex;
	gap: 24px;
  align-items: center;
	justify-content: space-between;
  border: 1px solid ${({theme}: {theme: Themes}) => theme === Themes.DARK ? COLORS.grey4 : COLORS.grey2};
  border-radius: 8px;
	height: 32px;
	padding: 0 16px;
`