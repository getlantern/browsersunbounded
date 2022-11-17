import {COLORS} from '../../../constants'
import styled from 'styled-components'

const Text = styled.p`
  font-weight: 400;
  font-size: 14px;
  line-height: 28px;
  color: ${COLORS.grey};
	padding: 0 8px;
	margin: 24px 0;
	a {
		color: ${COLORS.brand}
	}
`

export {Text}