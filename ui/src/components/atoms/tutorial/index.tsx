import {Container, Text, ArrowUp, CloseButton} from './styles'
import {X} from '../icons'
import {StateEmitter, useEmitterState} from '../../../hooks/useStateEmitter'
import {lifetimeConnectionsEmitter} from '../../../utils/wasmInterface'
import {useEffect, useState} from 'react'

export const tutorialOnEmitter = new StateEmitter<boolean>(false)

const Tutorial = () => {
	const tutorialOn = useEmitterState(tutorialOnEmitter)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (lifetimeConnections === 0 && !tutorialOn) tutorialOnEmitter.update(true)
		else if (lifetimeConnections > 0 && tutorialOn) tutorialOnEmitter.update(false)
		const timeout = setTimeout(() => setReady(true), 500) // wait for connections to be updated
		return () => clearTimeout(timeout)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lifetimeConnections])

	if (!tutorialOn || !ready) return null

	return (
		<Container>
			<Text>Toggle this switch to start helping!</Text>
			<CloseButton
				onClick={() => tutorialOnEmitter.update(false)}
			>
				<X/>
			</CloseButton>
			<ArrowUp />
		</Container>
	)
}

export default Tutorial