import styled from 'styled-components'
import {BREAKPOINT} from '../../../constants'

const Text = styled.p`
  font-weight: 600;
  padding: 0 8px;
  margin: 24px 0;

  font-size: 24px;
  line-height: 32px;
	
	@media (min-width: ${BREAKPOINT}px) {
    font-size: 32px;
    line-height: 39px;
	}
`

export {Text}