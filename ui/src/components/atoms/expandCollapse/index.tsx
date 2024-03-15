import {Arrow, Collapse, Expand} from '../icons'
import React, {Dispatch, SetStateAction} from 'react'
import styled from 'styled-components'
import {Text} from '../typography'

const StyledButton = styled.button`
	&& {
    border: none;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    align-items: center;
    background-color: transparent;
    cursor: pointer;
    padding: 0;
	}
`

interface Props {
	expanded: boolean
	setExpanded: Dispatch<SetStateAction<boolean>>
	carrot?: boolean
}
const ExpandCollapse = ({expanded, setExpanded, carrot = false}: Props) => {
	return (
		<StyledButton
			aria-label={expanded ? 'collapse' : 'expand'}
			onClick={() => setExpanded(!expanded)}
		>
			{
				expanded ? <Collapse carrot={carrot} /> : <Expand carrot={carrot} />
			}
		</StyledButton>
	)
}

export const ExpandCollapsePanel = ({expanded, setExpanded}: Props) => {
	return (
		<StyledButton
			onClick={() => setExpanded(!expanded)}
		>
			<Text
				style={{
					textDecoration: 'underline',
					fontSize: 12
				}}
			>
				{`${expanded ? 'Hide' : 'Show'} Globe`}
			</Text>
			<Arrow
				up={expanded}
			/>
		</StyledButton>
	)
}

export default ExpandCollapse