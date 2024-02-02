import {useCallback, useEffect, useRef, useState} from 'react'
import {Connection, connectionsEmitter, sharingEmitter} from '../utils/wasmInterface'
import {useEmitterState} from './useStateEmitter'
import {countries} from '../utils/countries'
import {pushNotification} from '../components/molecules/notification'

type ISO = keyof typeof countries

export interface Arch {
	startLat: number
	startLng: number
	endLat: number
	endLng: number
	country: string
	iso: string
	workerIdx: number
	count: number
	altitude: number
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
const ARCH_ALTITUDE_GAP = 0.05
const ARCH_ALTITUDE_MIN = 0.3

// this function is a fallback if geo lookup fails. It uses the navigator's language to determine the country
const getCountryFromNavigator = (): ISO => {
	const lang = navigator.language
	console.warn(
		`Uncensored geo lookup failed, using fallback. Navigator language: ${lang}, ISO: ${lang.split('-')?.[1]}, fallback: ${UNCENSORED_ISO_FALLBACK}`
	)
	return lang.split('-')?.[1] as ISO || UNCENSORED_ISO_FALLBACK
}

// a null ip results in a self lookup
export const geoLookup = async (ip: string | null): Promise<ISO> => {
	const isSelf = ip === null
	try {
		const res = await fetch(`${process.env.REACT_APP_GEO_LOOKUP_URL}/${isSelf ? '' : ip}`)
		const data = await res.json()
		return data.Country.IsoCode
	} catch (e) {
		if (!isSelf) console.warn(`Censored geo lookup failed for ${ip}, using fallback. Fallback: ${CENSORED_ISO_FALLBACK}`)
		return isSelf ? getCountryFromNavigator() : CENSORED_ISO_FALLBACK
	}
}

const geoLookupAll = async (connections: Connection[]): Promise<GeoLookup[]> => {
	const res = await Promise.all(connections.map(connection => geoLookup(connection.addr)))
	return res.flat().map((iso, index) => ({iso, workerIdx: connections[index].workerIdx}))
}

const createArcs = (geos: GeoLookup[], isoCountMap: { [key: string]: number }, userIso: ISO) => {
	const newArcs: Arch[] = []
	geos.forEach((geo, index) => {
		const {workerIdx} = geo
		const iso = geo.iso as keyof typeof countries
		const country = countries[iso] || countries[CENSORED_ISO_FALLBACK]
		const userCountry = countries[userIso] || countries[UNCENSORED_ISO_FALLBACK]
		const count = isoCountMap[iso] || geos.filter(g => g.iso === iso).length // use count from map if it exists
		// set altitude based on count minus the number of geos with the same iso that come after this one
		const altitudeFactor = count - geos.filter((g, i) => g.iso === iso && i > index).length
		newArcs.push({
			startLng: userCountry.longitude,
			startLat: userCountry.latitude,
			endLng: country.longitude,
			endLat: country.latitude,
			country: country.name,
			iso: country.alpha2code,
			workerIdx: workerIdx,
			altitude: ARCH_ALTITUDE_MIN + (altitudeFactor * ARCH_ALTITUDE_GAP),
			count: count
		})
	})

	return newArcs
}

const decrementArcs = (arcs: Arch[], remove: Connection[]) => {
	const rmIds = remove.map(r => r.workerIdx)
	const arcsToRemove = arcs.filter(arc => {
		return rmIds.includes(arc.workerIdx)
	})
	for (const rmArch of arcsToRemove) {
		// remove arcs in place
		const index = arcs.findIndex(arc => arc.workerIdx === rmArch.workerIdx)
		arcs.splice(index, 1)
		// decrement count
		const iso = rmArch.iso
		for (const arc of arcs) {
			// decrement count for all arcs with the same iso
			if (arc.iso === iso) arc.count--
		}
	}
	// reset altitudes
	const isoCountMap: { [key: string]: number } = {};

	for (const arc of arcs) {
		isoCountMap[arc.iso] = (isoCountMap[arc.iso] ?? 0) + 1;
		arc.altitude = ARCH_ALTITUDE_MIN + (isoCountMap[arc.iso] * ARCH_ALTITUDE_GAP);
	}
}

const incrementArcs = (arcs: Arch[], geos: GeoLookup[]) => {
	for (const arc of arcs) {
		const geo = geos.filter(g => g.iso === arc.iso)
		if (geo.length > 0) {
			arc.count += geo.length
		}
	}
}

export const useGeo = () => {
	const [arcs, setArcs] = useState<Arch[]>([])
	const [points, setPoints] = useState<Point[]>([])
	const country = useRef<ISO>()
	const connections = useEmitterState(connectionsEmitter)
	// const connections = useQueueState(rawConnections)
	const active = connections.some(c => c.state === 1)
	const sharing = useEmitterState(sharingEmitter)
	const [updating, setUpdating] = useState(false)

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
		decrementArcs(arcs, removedConnections) // mutate arcs in place

		// removedConnections.forEach(con => {
		// 	removeNotification(con.workerIdx)
		// })

		const addedConnections = connections.filter(c => c.state === 1)
		const geos = await geoLookupAll(addedConnections)
		incrementArcs(arcs, geos)

		const isoCountMap = {} as { [key: string]: number }
		arcs.forEach(arc => {
			if (!isoCountMap[arc.iso]) isoCountMap[arc.iso] = arc.count
		})

		const newArcs = createArcs(geos, isoCountMap, country.current)

		const updatedArcs = [...arcs, ...newArcs]
		setArcs(updatedArcs)

		// dispatch push notifications
		geos.forEach(geo => {
			const country = updatedArcs.find(a => a.iso === geo.iso)?.country
			if (!country) return
			pushNotification({
				id: geo.workerIdx,
				text: `Helping a new person in ${country.split(',')[0]}`,
				autoHide: true,
				heart: true
			})
		})
	}, [arcs])

	useEffect(() => {
		if (updating) return // don't update while updating 🤪doing so causes a race condition
		// check if connections have changed since the last update (using arcs workerIdx)
		const updatedConnections = connections.filter(con => {
			if (con.state === -1) return arcs.some(arc => arc.workerIdx === con.workerIdx)
			return !arcs.some(arc => arc.workerIdx === con.workerIdx)
		})
		if (!updatedConnections.length) return // only update on changes
		setUpdating(true)
		updateArcs(updatedConnections).then(() => setUpdating(false))
	}, [connections, updateArcs, updating, arcs])

	useEffect(() => {
		if (sharing && !active) pushNotification({
			id: -1,
			text: 'Waiting for connections',
			ellipse: true
		})
	}, [sharing, active])

	useEffect(() => {
		// If no arcs, reset points and exit.
		if (!arcs.length) {
			setPoints([])
			return
		}

		const newPoints = [] as Point[]

		arcs.forEach(arc => {
			const isExistingPoint = points.some(p => arc.endLat === p.lat && arc.endLng === p.lng)
			const isNewPointDuplicate = newPoints.some(p => arc.endLat === p.lat && arc.endLng === p.lng)

			if (!isExistingPoint && !isNewPointDuplicate) {
				newPoints.push({
					lng: arc.endLng,
					lat: arc.endLat,
					id: arc.workerIdx
				})
			}
		})

		// If no origin point exists, add it.
		if (!points.some(p => p.origin)) {
			newPoints.push({
				lng: arcs[0].startLng,
				lat: arcs[0].startLat,
				origin: true,
				id: -1
			})
		}

		const oldPoints = points.filter(p =>
			p.id === -1 || arcs.some(a => a.endLat === p.lat && a.endLng === p.lng)
		)

		// Set points after a short delay.
		setTimeout(() => setPoints([...oldPoints, ...newPoints]), 0)

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [arcs])

	return {
		arcs: arcs,
		points: points,
		country: country.current
	}
}