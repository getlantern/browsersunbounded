import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import {StateEmitter} from './hooks/useStateEmitter'

const broflakes = document.querySelectorAll('broflake') as NodeListOf<HTMLElement>

export enum Layouts {
	'BANNER' = 'banner',
	'PANEL' = 'panel'
}

export enum Themes {
	'DARK' = 'dark',
	'LIGHT' = 'light'
}

export interface Settings {
	globe: boolean
	toast: boolean
	mobileBg: boolean
	desktopBg: boolean
	layout: Layouts
	theme: Themes
}

const defaultSettings: Settings = {
	mobileBg: true,
	desktopBg: true,
	toast: true,
	globe: true,
	layout: Layouts.BANNER,
	theme: Themes.LIGHT
}

export const settingsEmitter = new StateEmitter<{[key: number]: Settings}>({})

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

broflakes.forEach((embed, i) => {
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
			/>
		</React.StrictMode>
	)
})
