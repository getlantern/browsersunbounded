import styled from 'styled-components'
import {COLORS, SHADOWS} from '../../../constants'

export const Container = styled.div`
  position: absolute;
  bottom: 0;
  top: unset;
  border-radius: 100px;
  background: ${COLORS.grey1};
  border: 1px solid ${COLORS.grey2};
  box-shadow: ${SHADOWS.light};
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
	color: ${COLORS.blue5};
`

export const LottieContainer = styled.div`
  position: relative;
  width: 25px;
  height: 20px;
`

export const LottieWrapper = styled.div`
	position: absolute;
  bottom: -50px;
  left: -90px;
  width: 360px;
`