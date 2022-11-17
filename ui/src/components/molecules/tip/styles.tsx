import styled from 'styled-components'

const Container = styled.div`
  background: #000000;
  border-radius: 4px;
  filter: drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.16));
  color: white;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  transition: opacity 250ms ease-out;
  opacity: ${(props: {show: boolean}) => props.show ? 1 : 0};
	pointer-events: none;
`

export {Container}