export const twitterLink = (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

export const connectedTwitterLink = (connected: number | string) => {
	const text = `I've helped${!!connected ? ` ${connected}` : ''} people from censored regions connect to the uncensored internet. Use your internet connection to fight censorship. Join the #LanternNetwork at `
	const url = `network.lantern.io`
	return twitterLink(text, url)
}