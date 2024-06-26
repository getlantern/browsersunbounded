import styled from 'styled-components'
import {COLORS, Themes} from '../../../constants'

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${(props: { justify: string }) => props.justify};
  a {
    display: inline-flex;
  }
`

const Divider = styled.div`
  border-left: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.grey4 : COLORS.grey3};
  height: 20px;
`

const LanternLink = styled.a`
  align-items: center;
  gap: 10px;
	text-decoration: underline;
`

export {Container, Divider, LanternLink}