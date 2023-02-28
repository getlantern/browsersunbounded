import {LogoLeft} from '../icons'

const LogoLink = ({style = {}}) => {
	return (
		<a style={style} href={'https://network.lantern.io'} target={'_blank'} rel={'noopener noreferrer'}>
			<LogoLeft />
		</a>
	)
}

export default LogoLink