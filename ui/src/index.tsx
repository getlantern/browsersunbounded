import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import {StateEmitter} from './hooks/useStateEmitter'
import {Targets} from './utils/wasmInterface'

export enum Layouts {
	'BANNER' = 'banner',
	'PANEL' = 'panel',
	'FLOATING' = 'floating',
}

export enum Themes {
	'DARK' = 'dark',
	'LIGHT' = 'light'
}

export interface Settings {
	globe: boolean
	exit: boolean
	mobileBg: boolean
	desktopBg: boolean
	layout: Layouts
	theme: Themes
	editor: boolean
	donate: boolean
	collapse: boolean
	branding: boolean
	target: Targets
}

export const defaultSettings: Settings = {
	mobileBg: true,
	desktopBg: true,
	exit: true,
	globe: true,
	layout: Layouts.BANNER,
	theme: Themes.LIGHT,
	editor: false,
	donate: true,
	collapse: true,
	branding: true,
	target: Targets.WEB
}

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

