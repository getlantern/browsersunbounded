import styled from 'styled-components'
import {Themes} from '../../../index'
import {COLORS, MAX_WIDTH} from '../../../constants'

export const Container = styled.div`
  border-radius: 32px;
  border: 1px solid ${({theme}: { theme: Themes }) => theme === Themes.DARK ? COLORS.white : COLORS.grey2};
  width: 100%;
`

export const BodyWrapper = styled.div`
  padding: 24px 16px;
  display: flex;
	justify-content: center;
	align-items: center;
`

export const Body = styled.div`
  display: flex;
  width: 100%;
  gap: 24px;
  max-width: ${MAX_WIDTH}px;
  flex-direction: ${(props: {mobile: boolean}) => props.mobile ? 'column' : 'row'};
  align-items: center;
`

export const ExpandWrapper = styled.div`
	display: flex;
	justify-content: center;
`