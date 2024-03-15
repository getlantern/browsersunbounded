import styled from 'styled-components'
import {COLORS, Layouts, SHADOWS, Themes} from '../constants'

interface Props {
  theme: Themes
  $menu: boolean
  layout: Layouts
}

const AppWrapper = styled.section`
  font-family: 'Urbanist', sans-serif;
  display: flex;
  width: 100%;
  max-width: ${({layout}: Props) => layout === Layouts.PANEL ? '330px' : layout === Layouts.FLOATING ? '360px'  : 'unset'};
  border-radius: ${({layout}: Props) => layout !== Layouts.BANNER ? layout === Layouts.FLOATING ? '32px 32px 0 0' : '32px' : '0'};
  @media (max-width: 330px) { // supper small
    ${({layout}: Props) => layout === Layouts.PANEL ? 'border-radius: 16px;' : ''}
  }
  background-color: ${({theme, $menu}: Props) => theme === Themes.DARK ? COLORS.grey5 : $menu ? COLORS.grey1 : COLORS.white };
  box-sizing: content-box;
  position: ${({layout}: Props) => layout !== Layouts.FLOATING ? 'relative' : 'fixed'};
  ${({layout}: Props) => layout === Layouts.FLOATING ? 'bottom: 0;\n  right: 10px;\n z-index: 2147483646;' : ''} // 2147483647 is largest positive value of a signed integer on a 32 bit system
  margin: 0 auto;
  box-shadow: ${({layout}: Props) => layout === Layouts.FLOATING ? SHADOWS.light : ''};
  * {
    box-sizing: unset;
    //all: revert;
  }
`

export {AppWrapper}