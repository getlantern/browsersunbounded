import styled from 'styled-components'

const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;

  > div {
    position: absolute;
    top: -24px;
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