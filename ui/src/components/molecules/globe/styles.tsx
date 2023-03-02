import styled from 'styled-components'

interface Props {
	size: number
	active: boolean
	$title: boolean
}
const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 250px; // sm breakpoint
  max-height: 350px; // lg breakpoint
  display: flex;
  justify-content: center;
  align-items: center;
  //overflow: hidden;
  position: relative;

  > div {
    position: absolute;
    top: ${({size, $title}: Props) => size === 250 ? -10 : $title ? -40 : -80}px; // ugly offset to match figma @todo try to fix this with flexbox
    cursor: ${({active}: Props) => active ? 'pointer': 'all-scroll'};
  }

  > span.shadow {
    position: absolute;
    bottom: 0;
    width: ${({size}: {size: number}) => size}px;
	  height: 30px;
  }
`

export {Container}