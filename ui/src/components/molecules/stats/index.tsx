import {Text} from '../../atoms/typography'
import Row from '../../atoms/row'
import {useStats} from '../../../hooks/useStats'
import React, {useContext} from 'react'
import {AppContext} from '../../../context'
import {BREAKPOINT} from '../../../constants'

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
	const currentConnections = connections.filter(c => c.state === 1).length
	const totalChunks = chunks.map(c => c.size).reduce((p, c) => p + c, 0)
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
				<Text>{Math.round(throughput * 0.001 * 100) / 100} kb/sec</Text>
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
				<Text>{Math.round(totalChunks * 0.000001 * 100) / 100} MB</Text>
			</Row>
		</>
	)
}

export default Stats