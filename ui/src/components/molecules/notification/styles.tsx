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
	padding: 8px 16px;
  transition: opacity 300ms ease-out, bottom 300ms ease-out;
`

export const Text = styled.p`
  margin: 0;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
`