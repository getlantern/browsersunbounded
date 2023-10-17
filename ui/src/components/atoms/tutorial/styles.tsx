import styled from 'styled-components'
import {COLORS} from '../../../constants'

export const Container = styled.div`
  border-radius: 32px;
  position: absolute;
  top: 40px;
  left: -200px;
	border: 1px solid ${COLORS.green2};
	background: #007A02;
  padding: 6px 8px;
	display: flex;
	gap: 8px;
  align-items: center;
`;

export const Text = styled.p`
	color: ${COLORS.white};
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 20px;
	margin: 0;
`

export const ArrowUp = styled.div`
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 11px solid ${COLORS.green2};
  position: absolute;
  top: -11px;
  right: 24px;
	
	&:before {
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 11px solid #007A02;
    position: absolute;
    top: 2px;
    right: -10px;
    content: "";
	}
`

export const CloseButton = styled.button`
	margin: 0;
	padding: 0;
	background-color: transparent;
	background: transparent;
	border: none;
	outline: none;
	cursor: pointer;
	display: flex;
	justify-content: center;
	align-items: center;
`