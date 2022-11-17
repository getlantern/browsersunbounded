import {useCallback, useEffect, useMemo, useState} from 'react'
import {usePrevious} from './usePrevious'
import {Connection, connectionsEmitter} from '../utils/wasmInterface'
import {mockLoc} from '../mocks/mockData'
import {useEmitterState} from './useStateEmitter'

export interface Arch {
	startLat: number
	startLng: number
	endLat: number
	endLng: number
	country: string
	count: number
	workerIdx: number
}

export interface Point {
	lng: number
	lat: number
}

const createArcs = (connections: Connection[]) => (
	connections.map(connection => {
		const { workerIdx, loc } = connection
		const { country, count, coords } = loc
		return ({
			startLng: mockLoc[0], // @todo user user loc
			startLat: mockLoc[1], // @todo user user loc
			endLng: coords[0],
			endLat: coords[1],
			country,
			count,
			workerIdx
		})
	})
)

const removeArcs = (arcs: Arch[], remove: Connection[]) => {
	return arcs.filter(a => !remove.some(c => c.workerIdx === a.workerIdx))
}

export const useGeo = () => {
	const [arcs, setArcs] = useState<Arch[]>([])
	const connections = useEmitterState(connectionsEmitter)
	const prevConnections = usePrevious(connections)

	const updateArcs = useCallback((connections: Connection[]) => {
		/***
			The webgl lib mutates the arcs arr in place. These mutations must be retained so that existing arcs do not
		  re-animate on state changes. I.e. we can't simply return a new map here. Arcs must be removed/added using the
		  current arc state.

		  "Basically, internally the framework performs an equality comparison on the array items that were previously
      included, and leaves them unaffected as there were already WebGL objects generated. This is done for performance
		  reasons between updates actually, because re-generating many objects when potentially only a subset is new would
		  be wasteful of resources. The added benefit is that their current rendering state (as in its animated position)
		  is also not reset in the process." - https://github.com/vasturiano
		 ***/
		const newConnections = connections.filter(c => !arcs.some(a => a.workerIdx === c.workerIdx) && c.state === 1)
		const removedConnections = connections.filter(c => arcs.some(a => a.workerIdx === c.workerIdx) && c.state === -1)
		setArcs([...removeArcs(arcs, removedConnections), ...createArcs(newConnections)])
	},[arcs])

	useEffect(() => {
		if (prevConnections === connections) return // only update on changes
		updateArcs(connections)
	}, [prevConnections, connections, updateArcs])

	const points = useMemo<Point[]>(() => {
		return arcs.map(arc => {
			return ({
				lng: arc.endLng,
				lat: arc.endLat,
			})
		})
	}, [arcs])

	return {
		arcs,
		points
	}
}