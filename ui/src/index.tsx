import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import {StateEmitter} from './hooks/useStateEmitter'
import {Settings, defaultSettings} from './constants'

export const settingsEmitter = new StateEmitter<{ [key: number]: Settings }>({})

const hydrateSettings = (i: number, dataset: Settings) => {
	const settings = {...defaultSettings}
	Object.keys(settings).forEach(key => {
		try {
			// @ts-ignore
			settings[key] = JSON.parse(dataset[key])
		} catch {
			// @ts-ignore
			settings[key] = dataset[key] || settings[key]
		}
	})
	Object.keys(process.env).filter(key => {
		const envKey = key.split('REACT_APP_')[1]
		const settingsKeys = Object.keys(settings).map(k => k.toUpperCase())
		return envKey && settingsKeys.includes(envKey)
	}).forEach(key => {
		const settingsKey = Object.keys(settings).find(k => {
			return key.split('REACT_APP_')[1] === k.toUpperCase()
		})
		try {
			// @ts-ignore
			settings[settingsKey] = JSON.parse(process.env[key])
		} catch {
			// @ts-ignore
			settings[settingsKey] = process.env[key]
		}
	})
	settingsEmitter.update({...settingsEmitter.state, [i]: settings})
}

const init = (embeds: NodeListOf<HTMLElement>) => {
	embeds.forEach((embed, i) => {
		const root = ReactDOM.createRoot(
			embed
		)

		const dataset = embed.dataset as unknown as Settings
		hydrateSettings(i, dataset)

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName && mutation.attributeName.includes('data-')) {
					// @ts-ignore
					const dataset = mutation.target.dataset as unknown as Settings
					hydrateSettings(i, dataset)
				}
			})
		})

		observer.observe(embed, {
			attributes: true, childList: false, characterData: false
		})

		root.render(
			<React.StrictMode>
				<App
					appId={i}
					embed={embed}
				/>
			</React.StrictMode>
		)
	})
}

const getEmbeds = () => document.querySelectorAll('lantern-network') as NodeListOf<HTMLElement>

// try to load embeds immediately
const embeds = getEmbeds()
if (embeds.length) init(embeds)
else {
	// if embeds are not loaded yet, wait for them to load
	const observer = new MutationObserver((mutations, mutationInstance) => {
		const embeds = getEmbeds()
		if (embeds.length) {
			init(embeds)
			mutationInstance.disconnect()
		}
	})

	observer.observe(document, {
		childList: true,
		subtree: true
	})
}

