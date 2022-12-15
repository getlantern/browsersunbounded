import {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT} from '../../../constants'
import {Container} from './styles'

const Suspense = () => {
	const {width} = useContext(AppContext)
	const size = width < BREAKPOINT ? 300 : 400
	return (
		<Container
			size={size}
		>
			{/*@todo globe loading ui*/}
			<div style={{width: size, height: size}} />
		</Container>
	)
}

export default Suspense