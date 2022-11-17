import {Container} from './styles'

interface Props {
	children: (JSX.Element | false)[] | JSX.Element | false
}

const Col = ({children}: Props) => {
	return (
		<Container>
			{children}
		</Container>
	)
}

export default Col