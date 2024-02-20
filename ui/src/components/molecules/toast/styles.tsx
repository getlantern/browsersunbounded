import styled from 'styled-components'
import {COLORS, SHADOWS, Themes} from '../../../constants'

const Container = styled.div`
  //position: fixed;
  position: absolute;
  transition: opacity 250ms ease-out, top 250ms ease-out;
  opacity: ${(props: { show: boolean }) => props.show ? 1 : 0};
  right: 0;
  z-index: 1000;
  background: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.grey5 : COLORS.grey6};
  border: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.grey5 : COLORS.grey6};
  box-shadow: ${({theme}: {theme: Themes}) => theme === Themes.LIGHT ? SHADOWS.dark : SHADOWS.dark};
  border-radius: 32px;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  pointer-events: ${(props: { show: boolean }) => props.show ? 'auto' : 'none'};

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