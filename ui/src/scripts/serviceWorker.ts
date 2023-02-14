// @ts-nocheck @todo add types

console.log(`Test serviceWorker.ts ${new Date().toLocaleString()}`)

chrome.runtime.onMessage.addListener((request, sender, reply) => {
	console.log(sender)
	console.log(request)
	reply('hi from serviceWorker.ts')
})

chrome.offscreen.createDocument({
	url: chrome.runtime.getURL('offscreen.html'),
	reasons: ['WEB_RTC'],
	justification: 'offscreen.html used for WebRTC',
})

export {}