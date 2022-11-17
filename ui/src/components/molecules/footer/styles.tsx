import styled from 'styled-components'

const Container = styled.div`
	display: flex;
  align-items: center;
	justify-content: ${(props: {justify: string}) => props.justify};
	padding-left: 8px;
	a {
    display: inline-flex;
	}
`

const Divider = styled.div`
  border-left: 1px solid #BFBFBF;
  height: 20px;
`

export {Container, Divider}