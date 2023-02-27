import styled from 'styled-components'

export const StyledButton = styled.button`
  border: none;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  background-color: transparent;
  cursor: pointer;
  padding: 0;
`

export const MenuWrapper = styled.menu`
	z-index: 3;
	top: 0;
	position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
  gap: 16px;
  border-radius: 24px;
  margin: 0;
`

export const MenuItem = styled.li`
	display: flex;
  width: 100%;
	a {
		display: flex;
    width: 100%;
    align-items: center;
		gap: 8px;
    font-family: 'Urbanist', sans-serif;
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    line-height: 32px;
		text-decoration: none;
		white-space: nowrap;
	}
`