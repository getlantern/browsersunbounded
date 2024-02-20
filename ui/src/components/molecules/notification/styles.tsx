import styled from 'styled-components'
import {COLORS, SHADOWS, Themes} from '../../../constants'

export const Container = styled.div`
  position: absolute;
  bottom: 0;
  top: unset;
  border-radius: 100px;
  background: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.grey1 : COLORS.grey6};
  border: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.grey2 : COLORS.grey6};
  box-shadow: ${({theme}: {theme: Themes}) => theme === Themes.LIGHT ? SHADOWS.light : SHADOWS.dark};
	padding: 14px 16px;
  transition: opacity 300ms ease-out, bottom 300ms ease-out;
	pointer-events: none;
	display: flex;
	gap: 16px;
	align-items: center;
	justify-content: center;
`

export const Text = styled.p`
  margin: 0;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  color: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.blue5 : COLORS.grey2};
`

export const LottieContainer = styled.div`
  position: relative;
  width: 32px;
  height: 27px;
`

export const LottieWrapper = styled.div`
  position: absolute;
  bottom: -55px;
  left: -105px;
  width: 420px;
`