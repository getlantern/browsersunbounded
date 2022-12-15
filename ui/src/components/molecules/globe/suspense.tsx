import {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT} from '../../../constants'
import {Container} from './styles'
import styled from 'styled-components'
import {Themes} from '../../../index'

const Loading = styled.div`
  display: flex;
	justify-content: center;
	align-items: center;
	.loader {
    width: 32px;
    height: 32px;
    --c: radial-gradient(${({theme}: {theme: string}) => theme === Themes.LIGHT ? 'farthest-side,#012D2D 90%,#0000' : 'farthest-side,#F8FAFB 90%,#0000'});
    background:
            var(--c) 0    0,
            var(--c) 100% 0,
            var(--c) 100% 100%,
            var(--c) 0    100%;
    background-size: 12px 12px;
    background-repeat: no-repeat;
    animation:d8 .5s infinite;

    @keyframes d8 {
      100% {background-position: 100% 0,100% 100%,0 100%,0 0}
	}
`

const Suspense = () => {
	const {theme} = useContext(AppContext)
	const {width} = useContext(AppContext)
	const size = width < BREAKPOINT ? 300 : 400
	return (
		<Container
			size={size}
		>
			{/*@todo globe loading ui*/}
			<Loading
				style={{width: size, height: size}}
				theme={theme}
			>
				<div className={'loader'} />
			</Loading>
		</Container>
	)
}

export default Suspense