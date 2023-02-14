// @ts-nocheck @todo add types

console.log(`Test offscreen.ts ${new Date().toLocaleString()}`)

chrome.runtime.onMessage.addListener((request, sender, reply) => {
	console.log(sender)
	console.log(request)
	if (request === 'start') globalThis.wasmInterface.start()
})

setTimeout(() => {
	chrome.runtime.sendMessage('hi from offscreen.ts', (response) => {
		console.log('received response', response)
	})
}, 1000)

export {}