import styled from 'styled-components'
import {COLORS, MAX_WIDTH} from '../constants'

const Main = styled.main`
  display: flex;
  gap: 48px;
  max-width: ${MAX_WIDTH}px;
  width: 100%;
	flex-direction: ${(props: {mobile: boolean}) => props.mobile ? 'column' : 'row'};
  padding: 24px 10px;
`

const AppWrapper = styled.section`
  font-family: 'Urbanist', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  width: 100%;
	background-color: ${COLORS.veryLightGrey};
`

export {Main, AppWrapper}