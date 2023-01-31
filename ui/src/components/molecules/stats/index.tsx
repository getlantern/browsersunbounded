import {Text} from '../../atoms/typography'
import Row from '../../atoms/row'
import React, {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT} from '../../../constants'
import {formatBytes, getIndex} from '../../../hooks/useBytesFormatLatch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {
	averageThroughputEmitter,
	connectionsEmitter,
	lifetimeChunksEmitter,
	lifetimeConnectionsEmitter
} from '../../../utils/wasmInterface'
import useSample from '../../../hooks/useSample'

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
	const {width} = useContext(AppContext)
	const connections = useEmitterState(connectionsEmitter)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	const sampledThroughput = useSample({emitter: averageThroughputEmitter, ms: 500})
	const sampledLifetimeChunks = useSample({emitter: lifetimeChunksEmitter, ms: 500})
	const formattedThroughput = formatBytes(sampledThroughput, getIndex(sampledThroughput))
	const currentConnections = connections.filter(c => c.state === 1).length
	const totalChunks = sampledLifetimeChunks.map(c => c.size).reduce((p, c) => p + c, 0)
	const formattedTotalChunks = formatBytes(totalChunks, getIndex(totalChunks))

	return (
		<>
			<Row
				borderBottom
			>
				<Text>{'People you are helping connect' + (width > BREAKPOINT ? ' to the open Internet:' : ':')}</Text>
				<Text>{currentConnections}</Text>
			</Row>
			<Row
				borderBottom
			>
				<Text>Current throughput</Text>
				<Text>{formattedThroughput}/sec</Text>
			</Row>
			<Row
				borderBottom
			>
				<Text>Lifetime number of people connected</Text>
				<Text>{lifetimeConnections}</Text>
			</Row>
			<Row
				borderBottom
			>
				<Text>Lifetime data proxied</Text>
				<Text>{formattedTotalChunks.toUpperCase()}</Text>
			</Row>
		</>
	)
}

export default Stats