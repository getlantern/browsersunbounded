import styled from 'styled-components'

export const StyledEditor = styled.div`
  margin-bottom: 24px;
  font-family: 'Urbanist', sans-serif;
  display: flex;
  flex-wrap: wrap;
	gap: 16px;
	fieldset {
		flex-grow: 1;
    border-radius: 8px;
    border: 1px solid black;
		margin: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
	}
`