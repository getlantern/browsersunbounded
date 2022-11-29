import {Collapse, Expand} from '../icons'
import React, {Dispatch, SetStateAction} from 'react'
import styled from 'styled-components'

const StyledButton = styled.button`
	border: none;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	background-color: transparent;
	cursor: pointer;
	padding: 0;
`

interface Props {
	expanded: boolean
	setExpanded: Dispatch<SetStateAction<boolean>>
}
const ExpandCollapse = ({expanded, setExpanded}: Props) => {
	return (
		<StyledButton
			aria-label={expanded ? 'collapse' : 'expand'}
			onClick={() => setExpanded(!expanded)}
		>
			{
				expanded ? <Collapse /> : <Expand />
			}
		</StyledButton>
	)
}

export default ExpandCollapse