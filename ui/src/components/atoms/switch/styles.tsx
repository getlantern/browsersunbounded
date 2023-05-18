import styled from 'styled-components'
import {COLORS, Themes} from '../../../constants'

const Container = styled.div`
  display: flex;
  align-items: center;
`

const Label = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 24px;
`

const Input = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`

interface Props {
	disabled: boolean
	checked: boolean
	theme: Themes
	$loading: boolean
}

const Slider = styled.span`
  position: absolute;
  cursor: ${({disabled}: Props) => disabled ? 'not-allowed' : 'pointer'};
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({
                         checked,
                         theme
                       }: Props) => checked ? COLORS.green : theme === Themes.DARK ? COLORS.grey : COLORS.grey};
  transition: 0.4s;
  border-radius: 34px;

  &:before {
    position: absolute;
    content: "";
    height: 17px;
    width: 17px;
    left: 3.5px;
    bottom: 3.5px;
    background-color: ${({$loading}: Props) => $loading ? 'transparent' : COLORS.white};
    border-radius: 50%;
    transition: transform 250ms;
    transform: translateX(${({checked}: Props) => checked ? '16px' : 0});
  }
`

const LoadingSpinner = styled.div`
  border: 2.5px solid transparent;
  border-top: 2.5px solid ${COLORS.white};
  border-right: 2.5px solid ${COLORS.white};
  border-radius: 50%;
  width: 17px;
  height: 17px;
  animation: spin 1s linear infinite;
  position: absolute;
  top: 3.5px;
  left: 3.5px;
  box-sizing: border-box;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`


export {Container, Label, Input, Slider, LoadingSpinner}