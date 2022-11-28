import {Container, Item} from './styles'
import {Expand, Logo} from '../../atoms/icons'
import Control from '../../molecules/control'
import React from 'react'
import {useStats} from '../../../hooks/useStats'
import {Text} from '../../atoms/typography'

interface Props {
	isSharing: boolean
	onShare: (s: boolean) => void
}

const Banner = ({isSharing, onShare}: Props) => {
	const {connections} = useStats({sampleMs: 500})
	const currentConnections = connections.filter(c => c.state === 1).length
	return (
		<Container>
			<Logo />
			<Item>
				<Control
					isSharing={isSharing}
					onShare={onShare}
				/>
			</Item>
			<Item>
				<Text>People you are helping connect:</Text>
				<Text
					style={{minWidth: 10}}
				>
					{currentConnections}
				</Text>
			</Item>
			<Expand />
		</Container>
	)
}

export default Banner