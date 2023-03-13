import {useCallback, useEffect, useState} from 'react'
import {AUTO_UPDATE_URL, Targets} from '../constants'
import {useEmitterState} from './useStateEmitter'
import {sharingEmitter} from '../utils/wasmInterface'

// hook fetches the last modified header from manifest.jsom every hour and compares it to the existing state.
// If they are different, it reloads the page. A simple way to force a reload of the page when the manifest.json changes (new bundle published to the CDN).

const ONE_HOUR = 1000 * 60 * 60
export const AUTO_START_STORAGE_FLAG = 'lanternNetworkAutoUpdateAutoStart'
const useAutoUpdate = (target: Targets) => {
	const [lastModified, setLastModified] = useState(new Date()) // safe to use app launch time as the initial value, since it just fetched the bundle
	const sharing = useEmitterState(sharingEmitter)

	const cb = useCallback(async () => {
		const res = await fetch(AUTO_UPDATE_URL, {method: 'HEAD'})
		const lastModifiedDateString = res.headers.get('Last-Modified') || ''
		if (!lastModifiedDateString) return console.warn('No last modified found in manifest.json header')
		const _lastModified = new Date(lastModifiedDateString)
		if (_lastModified > lastModified) {
			console.log('New bundle found, reloading page')
			// if currently sharing, set flag to auto start sharing on reload see app.tsx for more info
			// @todo: this is a bit hacky, eventually we should move this to the config eventually
			if (sharing) localStorage.setItem(AUTO_START_STORAGE_FLAG, 'true')
			window.location.reload()
		}
		setLastModified(_lastModified)
	}, [lastModified, sharing])

	useEffect(() => {
		// only run in offscreen window, all other targets are expected to be short-lived sessions and reloading would be poor ux
		if (target !== Targets.EXTENSION_OFFSCREEN) return

		// register interval to check for new bundle
		const interval = setInterval(() => {
			cb().then(() => null)
		}, ONE_HOUR)

		return () => clearInterval(interval)
	}, [target, cb])
}

export default useAutoUpdate