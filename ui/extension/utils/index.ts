import {MessageTypes} from '../../src/constants'
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
