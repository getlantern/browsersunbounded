import {Text} from '../../atoms/typography'
import Row from '../../atoms/row'
import {useStats} from '../../../hooks/useStats'
import React, {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT} from '../../../constants'
import {formatBytes, getIndex} from '../../../hooks/useBytesFormatLatch'

export const Connections = () => {
	const {connections} = useStats({sampleMs: 500})
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
	const {connections, lifetimeConnections, throughput, chunks} = useStats({sampleMs: 500})
	const formattedThroughput = formatBytes(throughput, getIndex(throughput))
	const currentConnections = connections.filter(c => c.state === 1).length
	const totalChunks = chunks.map(c => c.size).reduce((p, c) => p + c, 0)
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