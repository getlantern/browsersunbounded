import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {usePrevious} from './usePrevious'
import {Connection, connectionsEmitter, sharingEmitter} from '../utils/wasmInterface'
import {useEmitterState} from './useStateEmitter'
import {countries} from "../utils/countries";
import useQueuedState from './useQueuedState'
import {pushNotification, removeNotification} from '../components/molecules/notification'

type ISO = keyof typeof countries

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
	origin?: boolean
	id: number
}

export interface GeoLookup {
	iso: string
	workerIdx: number
}

const CENSORED_ISO_FALLBACK = 'IR'
const UNCENSORED_ISO_FALLBACK = 'US'

// this function is a fallback if geo lookup fails. It uses the navigator's language to determine the country
const getCountryFromNavigator = (): ISO => {
	const lang = navigator.language
	return lang.split('-')?.[1] as ISO || UNCENSORED_ISO_FALLBACK
}

// a null ip results in a self lookup
export const geoLookup = async (ip: string | null): Promise<ISO> => {
	const isSelf = ip === null
	try {
		const res = await fetch(`${process.env.REACT_APP_GEO_LOOKUP_URL}/${isSelf ? '' : ip}`);
		const data = await res.json()
		return data.Country.IsoCode
	} catch (e) {
		console.warn('Geo lookup failed, using fallback.')
		return isSelf ? getCountryFromNavigator() : CENSORED_ISO_FALLBACK
	}
}

const geoLookupAll = async (connections: Connection[]): Promise<GeoLookup[]> => {
	const res = await Promise.all(connections.map(connection => geoLookup(connection.addr)))
	return res.flat().map((iso, index) => ({iso, workerIdx: connections[index].workerIdx}))
}

const createArcs = (geos: GeoLookup[], userIso: ISO ) => (
	geos.map(geo => {
		const {workerIdx} = geo
		const iso = geo.iso as keyof typeof countries
		const country = countries[iso] || countries[CENSORED_ISO_FALLBACK]
		const userCountry = countries[userIso] || countries[UNCENSORED_ISO_FALLBACK]
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
	const [points, setPoints] = useState<Point[]>([])
	const activeArcs = useMemo(() => arcs.filter(a => a.workerIdxArr.length > 0), [arcs])
	const country = useRef<ISO>()
	const rawConnections = useEmitterState(connectionsEmitter)
	const queuedConnections = useQueuedState(rawConnections, 1000) // only update every 1 seconds
	const active = [...rawConnections].some(c => c.state === 1)
	const connections = useMemo(() => {
		return active ? queuedConnections : rawConnections
	}, [rawConnections, queuedConnections, active])
	const prevConnections = usePrevious(connections)
	const sharing = useEmitterState(sharingEmitter)

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

		removedConnections.forEach(con => {
			removeNotification(con.workerIdx)
		})

		const addedConnections = connections.filter(c => c.state === 1)
		const geos = await geoLookupAll(addedConnections)
		incrementArcs(arcs, geos)

		const newGeos = geos.filter(geo => !arcs.some(a => a.iso === geo.iso))
		const newArcs = createArcs(newGeos, country.current)

		const updatedArcs = [...arcs, ...newArcs]
		setArcs(updatedArcs)

		// dispatch push notifications if there is a single new connection (not a sync)
		if (geos.length === 1) {
			const country = updatedArcs.find(a => a.iso === geos[0].iso)?.country
			if (!country) return
			pushNotification({
				id: geos[0].workerIdx,
				text: `New connection: ${country.split(',')[0]}`,
				autoHide: true,
			})
		}

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

	useEffect(() => {
		if (sharing && !active) pushNotification({
			id: -1,
			text: 'Waiting for connections',
			ellipse: true,
		})
		else removeNotification(-1)
	}, [sharing, active])

	useEffect(() => {
		if (activeArcs.length === 0) {
			setPoints([])
			return
		}
		const newPoints = []
		activeArcs.forEach(arc => {
			if (!points.some(p => p.id === arc.workerIdxArr[0])) {
				newPoints.push({
					lng: arc.endLng,
					lat: arc.endLat,
					id: arc.workerIdxArr[0]
				})
			}
		})
		if (activeArcs.length > 0 && !points.some(p => p.origin)) {
			newPoints.push({
				lng: activeArcs[0].startLng,
				lat: activeArcs[0].startLat,
				origin: true,
				id: -1
			})
		}
		const oldPoints = points.filter(p => p.id === -1 || activeArcs.some(a => a.workerIdxArr[0] === p.id))
		setPoints([...oldPoints, ...newPoints])
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeArcs.length])

	return {
		arcs: activeArcs,
		points: points,
		country: country.current
	}
}