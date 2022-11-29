import styled from 'styled-components'
import {COLORS, SHADOWS} from '../../../constants'
import {Themes} from '../../../index'

const Container = styled.div`
  position: fixed;
  transition: opacity 250ms ease-out, top 250ms ease-out;
  opacity: ${(props: { show: boolean }) => props.show ? 1 : 0};
  right: 0;
  z-index: 1000;
  background: ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.grey5 : COLORS.grey1};
  border: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.grey5 : COLORS.grey2};
  box-shadow: ${({theme}: {theme: Themes}) => theme === Themes.DARK ? SHADOWS.dark : SHADOWS.light};
  border-radius: 32px;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  pointer-events: none;

  svg {
    flex-shrink: 0;
  }

  margin: 10px;
`

const Text = styled.p`
  margin: 0;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
`
export {Container, Text}