import styled from 'styled-components'

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
    top: ${({size}: {size: number}) => size === 250 ? -10 : -48}px; // ugly offset to match figma
    cursor: pointer;
  }

  > span.shadow {
    position: absolute;
    bottom: 0;
    width: ${({size}: {size: number}) => size}px;
	  height: 30px;
  }
`

export {Container}