import {useEffect, useState} from 'react'

export const Ellipse = () => {
	const [dots, setDots] = useState<string>('')

	useEffect(() => {
		const interval = setInterval(() => {
			if (dots === '') setDots('.')
			else if (dots === '.') setDots('..')
			else if (dots === '..') setDots('...')
			else setDots('')
		}, 500)
		return () => clearInterval(interval)
	}, [dots])
	return (
		<span style={{width: 8, display: 'inline-block'}}>
			{dots}
		</span>
	)
}