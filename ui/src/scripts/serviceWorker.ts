console.log(`Test serviceWorker.ts ${new Date().toLocaleString()}`)

chrome.offscreen.createDocument({
		url: chrome.runtime.getURL('offscreen.html'),
		// @ts-ignore
		reasons: ['WEB_RTC'],
		justification: 'offscreen.html used for WebRTC',
	},
	() => null
)

export {}