import {MessageTypes} from '../../src/constants'
import UpdateAvailableDetails = chrome.runtime.UpdateAvailableDetails
export const iconToggleSubscribe = (message: MessageEvent, isFirefox: boolean) => {
	if (message.type === MessageTypes.STATE_UPDATE && message.data.emitter === 'sharingEmitter') {
		const state = message.data.value ? 'on' : 'off'
		// chrome and firefox have different apis for setting the icon :(
		chrome[isFirefox ? 'browserAction' : 'action'].setIcon({
			path: {
				"16": `/images/logo16_${state}.png`,
				"32": `/images/logo32_${state}.png`,
				"48": `/images/logo48_${state}.png`,
				"128": `/images/logo128_${state}.png`
			}
		})
	}
}

// Auto updater logic. This is used in the offscreen env in firefox
// (chrome.runtime.onUpdateAvailable unsupported in offscreen in chrome)
// and in the service worker env in chrome (service worker is unsupported in firefox).
// The timer is used to prevent all clients from reloading at the same time (taking down the network)
export const registerAutoUpdater = () => {
	if (!chrome.runtime.onUpdateAvailable) return // chrome.runtime is undefined in the offscreen env in chrome, but not in firefox
	const updateHandler = (details: UpdateAvailableDetails) => {
		// this creates a timeout for a random number of milliseconds in the next hour
		// this prevents all clients from reloading at the same time (taking down the network)
		const timeout = Math.floor(Math.random() * 3600000) // 1 hour in milliseconds
		setTimeout(() => {
			console.log(`new version ${details.version} available, reloading`)
			chrome.runtime.reload()
		}, timeout)
	}
	chrome.runtime.onUpdateAvailable.addListener(updateHandler)
	console.log('registered auto updater')
}
