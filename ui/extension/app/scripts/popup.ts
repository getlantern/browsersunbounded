import {MessageTypes, SIGNATURE, Themes, POPUP} from '../../../src/constants'
import {messageCheck} from '../../../src/utils/messages'

const popupApp = async () => {
	const theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? Themes.DARK : Themes.LIGHT
	const backgroundColor = theme === Themes.DARK ? '#1B1C1D' : '#F8FAFB'
	// set body styles based on user theme
	document.body.setAttribute(
		'style',
		`background-color: ${backgroundColor}; margin: 0; padding: 0; width: 330px; height: 606px; overflow: hidden;` // hide scrollbar on popup, inherit iframe scroll only
	)
	const styleElement = document.createElement('style')
	styleElement.textContent = 'html::-webkit-scrollbar{display:none !important}' + 'body::-webkit-scrollbar{display:none !important}'
	document.getElementsByTagName('body')[0].appendChild(styleElement)

	const iframe = document.createElement('iframe')
	iframe.src = process.env.EXTENSION_POPUP_URL!
	// set iframe styles based on user theme
	iframe.setAttribute(
		'style',
		`background-color: ${backgroundColor}; width: 330px; height: 606px; border: none; margin: 0; padding: 0; overflow: hidden;` // 4px buffer seems needed to hide unnecessary scrollbars
	)
	document.body.appendChild(iframe)
	await bindPopup(iframe)
}

const bindPopup = async (iframe: HTMLIFrameElement) => {
	// connect to port so that offscreen can subscribe to close events
	chrome.runtime.connect({'name': POPUP})

	// subscribe to messages from offscreen to forward to popup iframe
	chrome.runtime.onMessage.addListener((message) => {
		if (messageCheck(message)) {
			// console.log('message from chrome, forwarding to iframe: ', message)
			iframe.contentWindow!.postMessage(message, '*')
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
		if (messageCheck(message)) {
			// console.log('message from iframe, forwarding to chrome: ', message)
			chrome.runtime.sendMessage(message)
		}
	})
}

window.addEventListener('load', popupApp)