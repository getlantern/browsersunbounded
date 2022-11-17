import styled from 'styled-components'
import {COLORS} from '../../../constants'

interface Props {
	borderBottom: boolean
	borderTop: boolean
	backgroundColor: string
}

const Container = styled.div`
  border-bottom: 1px solid ${(props: Props) => props.borderBottom ? COLORS.lightGrey : COLORS.transparent};
  border-top: 1px solid ${(props: Props) => props.borderTop ? COLORS.lightGrey : COLORS.transparent};
	background-color: ${(props: Props) => props.backgroundColor};
  height: 48px;
  width: 100%;
	display: flex;
  justify-content: space-between;
	align-items: center;
	padding: 0 8px;
  box-sizing: border-box;
`

export {Container}