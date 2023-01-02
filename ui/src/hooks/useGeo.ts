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
	count: number
	workerIdx: number
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
	try {
		// @todo cors error, using proxy for now
		const res = await fetch(`https://app.localeyz.io/proxy/https://go-geoserve.herokuapp.com/lookup/${ip}`);
		const data = await res.json()
		return data.Country.IsoCode
	} catch (e) {
		console.warn('Geo lookup failed')
		return ip === null ? 'US': 'IR'  // @todo figure out UX for failed geo lookups
	}
}

const geoLookupAll = async (connections: Connection[]): Promise<GeoLookup[]> => {
	const res = await Promise.all(connections.map(connection => geoLookup(connection.addr)))
	return res.flat().map((iso, index) => ({iso, workerIdx: connections[index].workerIdx}))
}

const createArcs = (newConnections: Connection[], geos: GeoLookup[], userIos: string ) => (
	newConnections.map(connection => {
		const {workerIdx} = connection
		const ios = geos.find(g => g.workerIdx === workerIdx)!.iso as keyof typeof countries
		const country = countries[ios]
		const userCountry = countries[userIos as keyof typeof countries]
		return ({
			startLng: userCountry.longitude,
			startLat: userCountry.latitude,
			endLng: country.longitude,
			endLat: country.latitude,
			country: country.name,
			iso: country.alpha2code,
			count: 1,
			workerIdx
		})
	})
)

const decrementArcs = (arcs: Arch[], remove: Connection[]) => {
	arcs.forEach(arc => {
		const rm = remove.filter(c => c.workerIdx === arc.workerIdx)
		if (rm.length > 0) arc.count -= rm.length
	})
}

const incrementArcs = (arcs: Arch[], geos: GeoLookup[]) => {
	arcs.forEach(arc => {
		const geo = geos.filter(g => g.iso === arc.iso)
		if (geo.length > 0) arc.count += geo.length
	})
}

const dedupeArcs = (a: Arch[], b: Arch[]) => (
	a.filter(_a => !b.some(_b => _b.iso === _a.iso))
)

export const useGeo = () => {
	const [arcs, setArcs] = useState<Arch[]>([])
	const country = useRef('US')
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
		const newConnections = connections.filter(c => !arcs.some(a => a.workerIdx === c.workerIdx) && c.state === 1)
		const removedConnections = connections.filter(c => arcs.some(a => a.workerIdx === c.workerIdx) && c.state === -1)
		const newGeo = await geoLookupAll(newConnections)
		decrementArcs(arcs, removedConnections)
		incrementArcs(arcs, newGeo)
		setArcs([
			...arcs.filter(a => a.count > 0), // existing arcs
			...dedupeArcs(createArcs(newConnections, newGeo, country.current), arcs)] // new arcs
		)
	}, [arcs])

	useEffect(() => {
		if (prevConnections === connections) return // only update on changes
		updateArcs(connections).then(null)
	}, [prevConnections, connections, updateArcs])

	const points = useMemo<Point[]>(() => {
		return arcs.map(arc => {
			return ({
				lng: arc.endLng,
				lat: arc.endLat
			})
		})
	}, [arcs])

	return {
		arcs,
		points
	}
}