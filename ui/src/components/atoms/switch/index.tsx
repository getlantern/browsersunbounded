import React, {ChangeEvent, useContext} from 'react'
import {Container, Input, Label, Slider} from './styles'
import {AppContext} from '../../../context'

interface Props {
	onToggle: (e: boolean) => void
	checked: boolean
	disabled: boolean
}

const Switch = ({onToggle, checked, disabled}: Props) => {
	const {theme} = useContext(AppContext)

	return (
		<Container>
			<Label>
				<Input
					type={'checkbox'}
					onChange={(e: ChangeEvent<HTMLInputElement>) =>
						onToggle(e.currentTarget.checked)
					}
					checked={checked}
					aria-label={'connect'}
					disabled={disabled}
					name={'lantern-network-connect'}
				/>
				<Slider
					checked={checked}
					disabled={disabled}
					theme={theme}
				/>
			</Label>
		</Container>
	)
}

export default Switch