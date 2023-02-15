console.log(`Test offscreen.ts ${new Date().toLocaleString()}`)

chrome.runtime.sendMessage('hi from offscreen.ts', () => null)

export {}