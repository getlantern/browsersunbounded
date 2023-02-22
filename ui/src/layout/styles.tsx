import styled from 'styled-components'
import {COLORS, Layouts, Themes} from '../constants'

const AppWrapper = styled.section`
  font-family: 'Urbanist', sans-serif;
  display: flex;
  width: 100%;
  max-width: ${({layout}: { layout: Layouts }) => layout !== Layouts.BANNER ? '320px' : 'unset'};
  border-radius: ${({layout}: { layout: Layouts }) => layout !== Layouts.BANNER ? layout === Layouts.FLOATING ? '32px 23px 0 0' : '32px' : '0'};
  background-color: ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.grey5 : COLORS.grey1};
  box-sizing: content-box;
  position: ${({layout}: { layout: Layouts }) => layout !== Layouts.FLOATING ? 'relative' : 'fixed'};
  ${({layout}: { layout: Layouts }) => layout === Layouts.FLOATING ? 'bottom: 0;\n  right: 10px; z-index: 2147483647' : ''} // 2147483647 is largest positive value of a signed integer on a 32 bit system
  margin: 0 auto;

  * {
    box-sizing: unset;
  }
`

export {AppWrapper}