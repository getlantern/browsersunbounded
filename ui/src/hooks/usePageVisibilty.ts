import {useEffect, useState} from 'react'

const usePageVisibility = () => {
	const [isVisible, setIsVisible] = useState(true)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				setIsVisible(true)
			} else {
				setIsVisible(false)
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange)
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [])
	return isVisible
}

export default usePageVisibility