import {Container, Text, ArrowUp, CloseButton} from './styles'
import {X} from '../icons'

const Tutorial = () => {
	return (
		<Container>
			<Text>Toggle this switch to start helping!</Text>
			<CloseButton>
				<X/>
			</CloseButton>
			<ArrowUp />
		</Container>
	)
}

export default Tutorial