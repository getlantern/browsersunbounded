import {Text} from '../../atoms/typography'
import Row from '../../atoms/row'
import React, {useContext} from 'react'
import {AppContext} from '../../../context'
// import {BREAKPOINT} from '../../../constants'
// import {formatBytes, getIndex} from '../../../hooks/useBytesFormatLatch'
import {useEmitterState} from '../../../hooks/useStateEmitter'
import {connectionsEmitter, lifetimeConnectionsEmitter} from '../../../utils/wasmInterface'
import {humanizeCount} from '../../../utils/humanize'
import {LifetimeConnectionsWrapper} from './styles'
import {Layouts} from '../../../constants'
import {useTranslation} from 'react-i18next'
// import TwitterLink from '../../atoms/twitterLink'
// import useSample from '../../../hooks/useSample'

export const Connections = () => {
	const {t} = useTranslation()
	const connections = useEmitterState(connectionsEmitter)
	const currentConnections = connections.filter(c => c.state === 1).length
	return (
		<>
			<Text>{t('now')}</Text>
			<Text
				style={{minWidth: 10}}
			>
				{currentConnections}
			</Text>
		</>
	)
}


const Stats = () => {
	const {t} = useTranslation()
	const {settings} = useContext(AppContext)
	const {menu, layout} = settings
	const connections = useEmitterState(connectionsEmitter)
	const lifetimeConnections = useEmitterState(lifetimeConnectionsEmitter)
	// const sampledThroughput = useSample({emitter: averageThroughputEmitter, ms: 500})
	// const sampledLifetimeChunks = useSample({emitter: lifetimeChunksEmitter, ms: 500})
	// const formattedThroughput = formatBytes(sampledThroughput, getIndex(sampledThroughput))
	const currentConnections = connections.filter(c => c.state === 1).length
	// const totalChunks = sampledLifetimeChunks.map(c => c.size).reduce((p, c) => p + c, 0)
	// const formattedTotalChunks = formatBytes(totalChunks, getIndex(totalChunks))

	const fontSize = layout === Layouts.BANNER ? 14 : 12

	return (
		<>
			<Row
				borderBottom
			>
				<Text style={{fontSize}}>{(t('now'))}</Text>
				<Text style={{fontSize}}>{currentConnections}</Text>
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
						<Text style={{fontSize}}>
							{t('total')}
						</Text>
					)
					: (
						<LifetimeConnectionsWrapper>
							<Text style={{fontSize}}>
								{t('total')}
							</Text>
							{/*<TwitterLink connections={lifetimeConnections} />*/}
						</LifetimeConnectionsWrapper>
					)
				}
				<Text style={{fontSize}}>{humanizeCount(lifetimeConnections)}</Text>
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