import styled from 'styled-components'
import {COLORS} from '../constants'
import {Themes} from '../index'

const Main = styled.div`
  display: flex;
	width: 100%;
`

const AppWrapper = styled.section`
  font-family: 'Urbanist', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
	background-color: ${({theme}) => theme === Themes.DARK ? COLORS.grey5 : COLORS.grey1};
	box-sizing: content-box;
	* {
    box-sizing: content-box;
  }
`

export {Main, AppWrapper}