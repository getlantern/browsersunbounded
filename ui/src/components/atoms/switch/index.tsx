import React, { ChangeEvent } from "react";
import {Label, Input, Slider, Container} from './styles'

interface Props {
	onToggle: (e: boolean) => void
	checked: boolean
}

const Switch = ({onToggle, checked}: Props) => {
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
				/>
				<Slider checked={checked} />
			</Label>
		</Container>
	);
};

export default Switch;