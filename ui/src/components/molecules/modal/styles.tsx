import styled from 'styled-components'
import {COLORS, Layouts, Themes} from '../../../constants'
import {getBorderRadius} from '../../../layout/styles'

const Container = styled.div`
  //position: fixed;
  position: absolute;
  transition: opacity 250ms ease-out;
  opacity: ${(props: { show: boolean }) => props.show ? 1 : 0};
  right: 0;
	top: 0;
	left: 0;
	bottom: 0;
  z-index: 1000;
  background: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.6)'};
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  pointer-events: ${(props: { show: boolean }) => props.show ? 'auto' : 'none'};
	width: 100%;
	height: 100%;
	border-radius: ${({ layout }: {layout: Layouts, show: boolean}) => getBorderRadius(layout)};

	svg {
    flex-shrink: 0;
  }
`

const Frame = styled.div`
    background: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.white : COLORS.grey6};
    border: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? `1px solid ${COLORS.grey3}` : `1px solid ${COLORS.grey4}`};
    border-radius: 16px;
		padding: 16px;
		width: 100%;
		max-width: 300px;

    display: flex;
    justify-content: center;
    align-items: center;
		flex-direction: column;
		gap: 10px;
		
		.header {
			display: flex;
			align-items: center;
			gap: 8px;
		}
`

export const Title = styled.h2`
	margin: 0;
	font-style: normal;
	font-weight: 500;
	font-size: 20px;
	line-height: 32px;
	color: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.black : COLORS.grey1};
`


const Text = styled.p`
  margin: 0;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 23px;
  color: ${({theme}: { theme: Themes }) => theme === Themes.LIGHT ? COLORS.black : COLORS.grey1};
`

const StyledLink = styled.a`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: row;
	border-radius: 32px;
	gap: 8px;
	min-height: 56px;
  box-sizing: border-box;
	text-decoration: none;
	padding: 0 32px;
	&:focus {
		outline: none;
	}
`

const StyledButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: row;
	gap: 8px;
	min-height: 32px;
  box-sizing: border-box;
	text-decoration: none;
	padding: 0 32px;
	cursor: pointer;
	border: none;
	background: ${COLORS.transparent};
	&:focus {
		outline: none;
	}
`

export {Container, Text, Frame, StyledLink, StyledButton}