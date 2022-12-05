import styled from 'styled-components'
import {COLORS} from '../constants'
import {Layouts, Themes} from '../index'

const AppWrapper = styled.section`
  font-family: 'Urbanist', sans-serif;
  display: flex;
  width: 100%;
	max-width: ${({layout}: {layout: Layouts}) => layout === Layouts.PANEL ? '320px' : 'unset'}; 
	border-radius: ${({layout}: {layout: Layouts}) => layout === Layouts.PANEL ? '32px' : '0'}; 
	background-color: ${({theme}: {theme: Themes}) => theme === Themes.DARK ? COLORS.grey5 : COLORS.grey1};
	box-sizing: content-box;
	position: relative;
	* {
    box-sizing: unset;
  }
`

export {AppWrapper}