import styled from 'styled-components'
import {COLORS, Themes} from '../../../constants'

const Container = styled.div`
  display: flex;
  align-items: center;
`

interface LabelProps {
	$animate: boolean
}

const Label = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 24px;
	
	border: 1px solid transparent;

  @keyframes fadeInOut {
    0% {
      filter: drop-shadow(0px 0px 12px rgba(0, 134, 50, 0));
      border: rgba(0, 134, 50, 0) 1px solid;
    }
    50% {
      filter: drop-shadow(0px 0px 12px rgba(0, 134, 50, 0.80));
      border: rgba(0, 134, 50, 1) 1px solid;
    }
    100% {
      filter: drop-shadow(0px 0px 12px rgba(0, 134, 50, 0));
      border: rgba(0, 134, 50, 0) 1px solid;
    }
  }
  ${({$animate}: LabelProps) => $animate ? `animation: fadeInOut 2400ms ease-out 200ms infinite;` : ''}
	border-radius: 34px;
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
	$isLarge: boolean
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
    height: ${props => props.$isLarge ? 23 : 17}px;
    width: ${props => props.$isLarge ? 23 : 17}px;
    left: 3.5px;
    bottom: 3.5px;
    background-color: ${({$loading}: Props) => $loading ? 'transparent' : COLORS.white};
    border-radius: 50%;
    transition: transform 250ms;
    transform: translateX(${({checked, $isLarge}: Props) => checked ? $isLarge ? '22px' : '16px' : 0});
  }
`

const LoadingSpinner = styled.div`
  border: 2.5px solid transparent;
  border-top: 2.5px solid ${COLORS.white};
  border-right: 2.5px solid ${COLORS.white};
  border-radius: 50%;
  height: ${(props: {$isLarge: boolean}) => props.$isLarge ? 23 : 17}px;
  width: ${(props: {$isLarge: boolean}) => props.$isLarge ? 23 : 17}px;
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