import {MessageTypes, SIGNATURE, Themes, POPUP} from '../../../src/constants'
// @todo fixup webpack config to use es6 imports
const _messageCheck = (message: MessageEvent['data']) => (typeof message === 'object' && message !== null && message.hasOwnProperty(SIGNATURE))
const app = () => {
	const theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? Themes.DARK : Themes.LIGHT
	const backgroundColor = theme === Themes.DARK ? '#1B1C1D' : '#F8FAFB'
	// set body styles based on user theme
	document.body.setAttribute(
		'style',
		`background-color: ${backgroundColor}; margin: 0; padding: 0; width: 320px; height: 642px;`
	)
	const iframe = document.createElement('iframe')
	iframe.src = process.env.POPUP_URL
	// set iframe styles based on user theme
	iframe.setAttribute(
		'style',
		`background-color: ${backgroundColor}; width: 320px; height: 642px; border: none; margin: 0; padding: 0; overflow: hidden;`
	)
	iframe.scrolling = 'no'
	document.body.appendChild(iframe)
	bindPopup(iframe)
}

const bindPopup = (iframe) => {
	// connect to port so that offscreen can subscribe to close events
	chrome.runtime.connect({'name': POPUP})

	// subscribe to messages from offscreen to forward to popup iframe
	chrome.runtime.onMessage.addListener((message) => {
		if (_messageCheck(message)) {
			// console.log('message from chrome, forwarding to iframe: ', message)
			iframe.contentWindow.postMessage(message, '*')
			iconToggleSubscribe(message) // @todo maybe move to service worker
			return false
		}
	})

	// send init message so offscreen knows popup is open
	chrome.runtime.sendMessage({
		type: MessageTypes.POPUP_OPENED,
		[SIGNATURE]: true,
		data: {}
	})

	// subscribe to messages from popup iframe to forward to offscreen
	window.addEventListener('message', event => {
		const message = event.data
		if (_messageCheck(message)) {
			// console.log('message from iframe, forwarding to chrome: ', message)
			chrome.runtime.sendMessage(message)
		}
	})
}

// toggle icon based on sharing status messages from offscreen
const iconToggleSubscribe = (message) => {
	if (message.type === MessageTypes.STATE_UPDATE && message.data.emitter === 'sharingEmitter') {
		const state = message.data.value ? 'on' : 'off'
		chrome.action.setIcon({
			path: {
				"16": `/images/logo16_${state}.png`,
				"32": `/images/logo32_${state}.png`,
				"48": `/images/logo48_${state}.png`,
				"128": `/images/logo128_${state}.png`
			}
		})
	}
}

window.addEventListener('load', app)