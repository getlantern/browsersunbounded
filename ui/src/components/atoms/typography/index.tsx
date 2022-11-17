import styled from 'styled-components'
import {COLORS} from '../../../constants'

const Text = styled.p`
  font-weight: 400;
  font-size: 14px;
  line-height: 23px;
  color: ${COLORS.black};
	padding: 0;
	margin: 0;
	a {
    color: ${COLORS.black};
  }
`

export {Text}