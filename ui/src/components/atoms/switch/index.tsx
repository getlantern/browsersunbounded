import React, { ChangeEvent } from "react";
import {Label, Input, Slider, Container} from './styles'

interface Props {
	onToggle: (e: boolean) => void
	checked: boolean
	disabled: boolean
}

const Switch = ({onToggle, checked, disabled}: Props) => {
	return (
		<Container>
			<Label>
				<Input
					type="checkbox"
					onChange={(e: ChangeEvent<HTMLInputElement>) =>
						onToggle(e.currentTarget.checked)
					}
					checked={checked}
					aria-label={'metric'}
					disabled={disabled}
				/>
				<Slider
					checked={checked}
					disabled={disabled}
				/>
			</Label>
		</Container>
	);
};

export default Switch;