import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {usePrevious} from './usePrevious'
import {Connection, connectionsEmitter} from '../utils/wasmInterface'
import {useEmitterState} from './useStateEmitter'
import {countries} from "../utils/countries";

export interface Arch {
	startLat: number
	startLng: number
	endLat: number
	endLng: number
	country: string
	iso: string
	workerIdxArr: number[]
}

export interface Point {
	lng: number
	lat: number
}

export interface GeoLookup {
	iso: string
	workerIdx: number
}

// a null ip results in a self lookup
export const geoLookup = async (ip: string | null): Promise<string> => {
	const isSelf = ip === null
	try {
		const res = await fetch(`${process.env.REACT_APP_GEO_LOOKUP}/${isSelf ? '' : ip}`);
		const data = await res.json()
		return data.Country.IsoCode
	} catch (e) {
		console.warn('Geo lookup failed')
		return isSelf ? 'US': 'IR'  // @todo locale fallback for isSelf geo
	}
}

const geoLookupAll = async (connections: Connection[]): Promise<GeoLookup[]> => {
	const res = await Promise.all(connections.map(connection => geoLookup(connection.addr)))
	return res.flat().map((iso, index) => ({iso, workerIdx: connections[index].workerIdx}))
}

const createArcs = (geos: GeoLookup[], userIso: string ) => (
	geos.map(geo => {
		const {workerIdx} = geo
		const iso = geo.iso as keyof typeof countries
		const country = countries[iso]
		const userCountry = countries[userIso as keyof typeof countries]
		return ({
			startLng: userCountry.longitude,
			startLat: userCountry.latitude,
			endLng: country.longitude,
			endLat: country.latitude,
			country: country.name,
			iso: country.alpha2code,
			workerIdxArr: [workerIdx]
		})
	})
)

const decrementArcs = (arcs: Arch[], remove: Connection[]) => {
	arcs.forEach(arc => {
		const rm = remove.filter(c => arc.workerIdxArr.some(id => id === c.workerIdx))
		if (rm.length) {
			const ids = rm.map(r => r.workerIdx)
			arc.workerIdxArr = arc.workerIdxArr.filter(id => !ids.includes(id))
		}
	})
}

const incrementArcs = (arcs: Arch[], geos: GeoLookup[]) => {
	arcs.forEach(arc => {
		const geo = geos.filter(g => g.iso === arc.iso)
		if (geo.length > 0) {
			const ids = geo.map(g => g.workerIdx)
			arc.workerIdxArr = [...arc.workerIdxArr, ...ids]
		}
	})
}

export const useGeo = () => {
	const [arcs, setArcs] = useState<Arch[]>([])
	const activeArcs = useMemo(() => arcs.filter(a => a.workerIdxArr.length > 0), [arcs])
	const country = useRef<string>()
	const connections = useEmitterState(connectionsEmitter)
	const prevConnections = usePrevious(connections)

	const updateArcs = useCallback(async (connections: Connection[]) => {
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
		if (!country.current) country.current = await geoLookup(null) // lookup user country first time

		const removedConnections = connections.filter(c => c.state === -1)
		decrementArcs(arcs, removedConnections)

		const addedConnections = connections.filter(c => c.state === 1)
		const geos = await geoLookupAll(addedConnections)
		incrementArcs(arcs, geos)

		const newGeos = geos.filter(geo => !arcs.some(a => a.iso === geo.iso))
		const newArcs = createArcs(newGeos, country.current)

		setArcs([
			...arcs,
			...newArcs
		])
	}, [arcs])

	useEffect(() => {
		if (prevConnections === connections) return // only update on changes
		const updatedConnections = connections.filter(connection => {
			const prevConnection = (
				prevConnections &&
				prevConnections.find(p => p.workerIdx === connection.workerIdx)
			)
			return (
				!prevConnection ||
				prevConnection.state !== connection.state ||
				prevConnection.addr !== connection.addr
			)
		})
		updateArcs(updatedConnections).then(null)
	}, [prevConnections, connections, updateArcs])

	const points = useMemo<Point[]>(() => {
		return activeArcs.map(arc => {
			return ({
				lng: arc.endLng,
				lat: arc.endLat
			})
		})
	}, [activeArcs])

	return {
		arcs,
		points
	}
}