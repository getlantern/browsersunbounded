import styled from 'styled-components'
import {COLORS, Themes} from '../../../constants'

interface Props {
	borderBottom: boolean
	borderTop: boolean
	backgroundColor: string
	theme: Themes
}

const Container = styled.div`
  border-bottom: 1px solid ${({
                                borderBottom,
                                theme
                              }: Props) => borderBottom ? theme === Themes.DARK ? COLORS.grey4 : COLORS.grey3 : COLORS.transparent};
  border-top: 1px solid ${({
                             borderTop,
                             theme
                           }: Props) => borderTop ? theme === Themes.DARK ? COLORS.grey4 : COLORS.grey3 : COLORS.transparent};
  background-color: ${(props: Props) => props.backgroundColor};
  height: 48px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  box-sizing: border-box;
	position: relative; // needed for the tutorial
`

export {Container}