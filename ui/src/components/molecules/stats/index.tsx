import {Text} from '../../atoms/typography'
import Row from '../../atoms/row'
import React, {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT} from '../../../constants'
// import {formatBytes, getIndex} from '../../../hooks/useBytesFormatLatch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {
	// averageThroughputEmitter,
	connectionsEmitter,
	// lifetimeChunksEmitter,
	lifetimeConnectionsEmitter
} from '../../../utils/wasmInterface'
import {humanizeCount} from '../../../utils/humanize'
import {LifetimeConnectionsWrapper} from './styles'
// import TwitterLink from '../../atoms/twitterLink'
// import useSample from '../../../hooks/useSample'

export const Connections = () => {
	const connections = useEmitterState(connectionsEmitter)
	const currentConnections = connections.filter(c => c.state === 1).length
	return (
		<>
			<Text>People you are helping connect:</Text>
			<Text
				style={{minWidth: 10}}
			>
				{currentConnections}
			</Text>
		</>
	)
}


const Stats = () => {
	const {width, settings} = useContext(AppContext)
	const {menu} = settings
	const connections = useEmitterState(connectionsEmitter)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	// const sampledThroughput = useSample({emitter: averageThroughputEmitter, ms: 500})
	// const sampledLifetimeChunks = useSample({emitter: lifetimeChunksEmitter, ms: 500})
	// const formattedThroughput = formatBytes(sampledThroughput, getIndex(sampledThroughput))
	const currentConnections = connections.filter(c => c.state === 1).length
	// const totalChunks = sampledLifetimeChunks.map(c => c.size).reduce((p, c) => p + c, 0)
	// const formattedTotalChunks = formatBytes(totalChunks, getIndex(totalChunks))

	return (
		<>
			<Row
				borderBottom
			>
				<Text>{'People you are helping connect' + (width > BREAKPOINT ? ' to the open Internet:' : ':')}</Text>
				<Text>{currentConnections}</Text>
			</Row>
			{/*<Row*/}
			{/*	borderBottom*/}
			{/*>*/}
			{/*	<Text>Current throughput</Text>*/}
			{/*	<Text>{formattedThroughput}/sec</Text>*/}
			{/*</Row>*/}
			<Row
				borderBottom
			>
				{
					menu ? (
						<Text>
							Total people helped to date:
						</Text>
					)
					: (
						<LifetimeConnectionsWrapper>
							<Text>
								Total people helped to date:
							</Text>
							{/*<TwitterLink connections={lifetimeConnections} />*/}
						</LifetimeConnectionsWrapper>
					)
				}
				<Text>{humanizeCount(lifetimeConnections)}</Text>
			</Row>
			{/*<Row*/}
			{/*	borderBottom*/}
			{/*>*/}
			{/*	<Text>Lifetime data proxied</Text>*/}
			{/*	<Text>{formattedTotalChunks.toUpperCase()}</Text>*/}
			{/*</Row>*/}
		</>
	)
}

export default Stats