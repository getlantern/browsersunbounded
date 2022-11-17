import styled from 'styled-components'
const Container = styled.div`
  position: fixed;
  transition: opacity 250ms ease-out, top 250ms ease-out;
  opacity: ${(props: {show: boolean}) => props.show ? 1 : 0};
	right: 0;
	z-index: 1000;
  background: #F9F9F9;
  border: 1px solid #EBEBEB;
  box-shadow: 0 4px 32px rgba(0, 97, 99, 0.1);
  border-radius: 4px;
	padding: 12px;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 12px;
	pointer-events: none;
	svg {
    flex-shrink: 0;
	}
	margin: 10px;
`

const Text = styled.p`
  color: #707070;
  margin: 0;
`
export {Container, Text}