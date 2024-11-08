import styled from 'styled-components'
import {COLORS, MAX_WIDTH, Themes} from '../../../constants'

export const Container = styled.div`
  box-sizing: border-box;
  border: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.grey6 : COLORS.grey2};
  width: 100%;
  border-radius: 16px;
`

export const Header = styled.div`
	display: flex;
  justify-content: space-between;
`

export const BodyWrapper = styled.div`
  padding: 24px 16px;
  display: flex;
	justify-content: center;
	align-items: center;
`

export const Body = styled.div`
  display: flex;
  width: 100%;
  max-width: ${MAX_WIDTH}px;
  flex-direction: ${(props: {mobile: boolean}) => props.mobile ? 'column' : 'row'};
  //align-items: center;
`

export const ExpandWrapper = styled.div`
	display: flex;
	justify-content: center;
`

export const CtaWrapper = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 24px 0 0 0;
`