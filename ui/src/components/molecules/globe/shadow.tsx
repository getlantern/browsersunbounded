import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Themes} from '../../../index'
import styled from 'styled-components'

// mixBlendMode is not supported on svgs in webkit so using css to create shadow instead
const StyledShadow = styled.span`
  background: ${({theme}: {theme: Themes}) => theme === Themes.DARK ? 
			'radial-gradient(49.66% 42.81% at 52.18% 56.64%, rgba(0, 0, 0, 0.5) 0%, rgba(1, 45, 45, 0.5) 30.21%, rgba(255, 255, 255, 0.5) 100%)'
      :
			'radial-gradient(49.66% 42.81% at 52.18% 56.64%, rgba(227, 227, 227, 0.5) 0%, rgba(234, 234, 234, 0.5) 24%, rgba(255, 255, 255, 0.5) 100%)'	  
	};
  background-blend-mode: multiply;
  mix-blend-mode: multiply;
	transition: scale 50ms ease-out;
`
const Shadow = ({scale}: {scale: number }) => {
	const {theme} = useContext(AppContext)
	return (
		<StyledShadow
			theme={theme}
			className={'shadow'}
			style={{
				transform: `scale(${scale})`,
			}}
		/>
	)
}

export default Shadow