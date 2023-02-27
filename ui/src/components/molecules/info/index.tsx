import {Info as InfoIcon} from '../../atoms/icons'
import {StyledButton, Wrapper} from './styles'
import {Text} from '../../atoms/typography'
import {useContext, useState} from 'react'
import { Popover } from 'react-tiny-popover'
import {AppContext} from '../../../context'
import {Targets} from '../../../constants'

const Info = () => {
	const {theme, target} = useContext(AppContext).settings
	const [active, setActive] = useState(false)
	return (
		<>
			<Popover
				isOpen={active}
				positions={['bottom', 'top', 'left', 'right']}
				onClickOutside={() => setActive(false)}
				content={
					<Wrapper
						theme={theme}
					>
						<Text>
							{'Sharing your connection enables people living with censorship to access the open internet.'}
							{/*<a href={'https://lantern.io'} target={'_blank'} rel={'noreferrer'}>Lantern</a>.*/}
							{ target !== Targets.EXTENSION_POPUP && ' Keep this site open to continue sharing your connection.' }
						</Text>
					</Wrapper>
				}
			>
				<StyledButton
					onClick={() => setActive(!active)}
				>
					<InfoIcon/>
				</StyledButton>
			</Popover>
		</>
	)
}

export default Info