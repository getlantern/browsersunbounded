import React, {ChangeEvent, useContext} from 'react'
import {Container, Input, Label, LoadingSpinner, Slider} from './styles'
import {AppContext} from '../../../context'

interface Props {
	onToggle: (e: boolean) => void
	checked: boolean
	disabled: boolean
	loading: boolean
}

const Switch = ({onToggle, checked, disabled, loading}: Props) => {
	const {theme, menu, collapse} = useContext(AppContext).settings
	const isLarge = !menu && !collapse

	return (
		<Container>
			<Label
				style={isLarge ? {height: 30, width: 52} : {}}
			>
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
					$loading={loading}
					$isLarge={isLarge}
				/>
				{
					loading && (
						<LoadingSpinner
							$isLarge={isLarge}
						/>
					)
				}
			</Label>
		</Container>
	)
}

export default Switch