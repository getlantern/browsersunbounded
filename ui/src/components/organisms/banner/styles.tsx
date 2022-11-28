import styled from 'styled-components'
import {COLORS} from '../../../constants'

export const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 32px;
  gap: 16px;
  height: 48px;
	background: ${COLORS.veryLightGrey};
  border: 1px solid ${COLORS.idkGrey};
	width: 100%;
	flex-shrink: 0;
	box-sizing: border-box;
`

export const Item = styled.div`
	display: flex;
	gap: 24px;
  align-items: center;
	justify-content: center;
  background: ${COLORS.white};
  border: 1px solid ${COLORS.idkGrey};
  border-radius: 8px;
	height: 32px;
	padding: 0 16px;
`