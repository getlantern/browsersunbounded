import {useCallback, useContext, useEffect, useState} from 'react'
import {AUTO_UPDATE_ETAG_URL, Targets} from '../constants'
import {AppContext} from '../context'

// hook fetches the last modified header from manifest.jsom every hour and compares it to the existing state.
// If they are different, it reloads the page. A simple way to force a reload of the page when the manifest.json changes (new bundle published to the CDN).

const ONE_HOUR = 1000 * 60 * 60
const useAutoUpdate = () => {
	const [lastModified, setLastModified] = useState(new Date()) // safe to use app launch time as the initial value, since it just fetched the bundle
	const {target} = useContext(AppContext).settings

	const cb = useCallback(async () => {
		const res = await fetch(AUTO_UPDATE_ETAG_URL, {method: 'HEAD'})
		const lastModifiedDateString = res.headers.get('Last-Modified') || ''
		if (!lastModifiedDateString) return console.warn('No last modified found in manifest.json header')
		const _lastModified = new Date(lastModifiedDateString)
		if (_lastModified > lastModified) {
			console.log('New bundle found, reloading page')
			window.location.reload()
		}
		setLastModified(_lastModified)
	}, [lastModified])

	useEffect(() => {
		// only run in offscreen window, all other targets are expected to be short-lived sessions and reloading would be poor ux
		if (target !== Targets.EXTENSION_OFFSCREEN) return
		const interval = setInterval(() => {
			cb().then(() => null)
		}, ONE_HOUR)
		return () => clearInterval(interval)
	}, [target, cb])
}

export default useAutoUpdate