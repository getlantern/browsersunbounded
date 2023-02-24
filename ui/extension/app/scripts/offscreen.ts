import {POPUP, SIGNATURE} from '../../../src/constants'
// @todo fixup webpack config to use es6 imports
const messageCheck = (message: MessageEvent['data']) => (typeof message === 'object' && message !== null && message.hasOwnProperty(SIGNATURE))
const app = () => {
	const state = {
		popupOpen: false // maintain state of popup open/close to prevent sending messages to closed popup
	}
	const iframe = document.createElement('iframe')
	iframe.src = process.env.OFFSCREEN_URL
	document.body.appendChild(iframe)
	bindOffscreen(iframe, state)
}

const bindOffscreen = (iframe, state) => {
	// subscribe to close events from popup to update state
	chrome.runtime.onConnect.addListener((port) => {
		if (port.name === POPUP) port.onDisconnect.addListener(() => {
			state.popupOpen = false
		})
		return false
	})

	// subscribe to messages from popup to forward to offscreen iframe
	chrome.runtime.onMessage.addListener((message) => {
		if (messageCheck(message)) {
			// if message is that popupOpened, update state
			if (message.type === 'popupOpened') return state.popupOpen = true
			// console.log('message from chrome, forwarding to iframe: ', message)
			iframe.contentWindow.postMessage(message, '*')
			return false
		}
	})

	// subscribe to messages from offscreen iframe to forward to popup
	window.addEventListener('message', event => {
		const message = event.data
		if (messageCheck(message)) {
			// console.log('message from iframe, forwarding to chrome: ', message)
			if (state.popupOpen) chrome.runtime.sendMessage(message)
		}
	})
}

window.addEventListener('load', app)