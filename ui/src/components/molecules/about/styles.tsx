import styled from 'styled-components'
import {BREAKPOINT} from '../../../constants'

const Text = styled.p`
  font-weight: 400;
  padding: 0 8px;
  margin: 24px 0;

  font-size: 12px;
  line-height: 20px;
	
	@media (min-width: ${BREAKPOINT}px) {
    font-size: 14px;
    line-height: 28px;
	}
`

export {Text}