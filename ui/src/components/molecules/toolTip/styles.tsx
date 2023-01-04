import styled from 'styled-components'
import {COLORS, SHADOWS} from '../../../constants'

const Container = styled.div`
  white-space: nowrap;
  background: ${COLORS.grey6};
  border-radius: 100px;
  box-shadow: ${SHADOWS.dark};
  color: ${COLORS.grey1};
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px 18px;
  transition: opacity 250ms ease-out;
  opacity: ${(props: {show: boolean}) => props.show ? 1 : 0};
  pointer-events: ${(props: {show: boolean}) => props.show ? 'auto' : 'none'};
`

export {Container}