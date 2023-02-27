export const isFirefox = () => {
	const userAgent = navigator.userAgent
	return !!userAgent.match(/firefox|fxios/i)
}