import styled from 'styled-components'
import {CSSProperties, useContext, useEffect, useRef, useState} from 'react'
import {AppContext} from '../../../context'
import {Themes} from '../../../index'
import {COLORS} from '../../../constants'

interface SvgProps {
	color: string,
	style: CSSProperties
}
const Line = ({style, color}: SvgProps) => (
	<svg style={style} className={'interact-anim-line'} width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
		<line x1="50.6822" y1="0.958816" x2="0.782834" y2="50.8582" stroke={color} strokeWidth="2" strokeDasharray="4 4"/>
	</svg>
)

const Cursor = ({color, style}: SvgProps) => (
	<svg style={style} className={'interact-anim-cursor'} width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g clipPath="url(#clip0_125_4658)">
			<path d="M14.9749 28.2768L9.5416 22.8435L11.0083 21.3768L13.9749 24.3435V18.0435H15.9749V24.3435L18.9416 21.3768L20.4083 22.8435L14.9749 28.2768ZM6.90827 20.2101L1.6416 14.9435L6.9416 9.64348L8.40827 11.1101L5.57493 13.9435H11.8749V15.9435H5.57493L8.37493 18.7435L6.90827 20.2101ZM23.0416 20.2101L21.5749 18.7435L24.3749 15.9435H18.1083V13.9435H24.3749L21.5749 11.1435L23.0416 9.67681L28.3083 14.9435L23.0416 20.2101ZM13.9749 11.8101V5.54348L11.1749 8.34348L9.70827 6.87681L14.9749 1.61015L20.2416 6.87681L18.7749 8.34348L15.9749 5.54348V11.8101H13.9749Z" fill={color}/>
		</g>
		<defs>
			<clipPath id="clip0_125_4658">
				<rect width="28" height="28" fill="white" transform="translate(0.975098 0.943481)"/>
			</clipPath>
		</defs>
	</svg>
)

const Container = styled.span`
	pointer-events: none;
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 2;
	transition: opacity 1000ms ease-in-out;
	.interact-anim-cursor {
    position: absolute;
	}
`
const InteractAnim = () => {
	const {theme} = useContext(AppContext)
	const color = theme === Themes.DARK ? COLORS.grey1 : COLORS.grey5
	const tick = useRef(0)
	const count = useRef(0)
	const [{start, animate, end}, setState] = useState({
		start: true,
		animate: false,
		end: false
	})
	const [hide, setHide] = useState(true)


	useEffect(() => {
		let interval: ReturnType<typeof setInterval> | null = null
		let timeout = setTimeout(() => {
			setHide(false)
			interval = setInterval(() => {
				if (count.current === 4 && interval) {
					// after 4 animations we stop and hide
					clearInterval(interval)
					setHide(true)
				}
				const start = tick.current <= 2 || tick.current > 4 // restart overlaps with end
				const animate = tick.current > 2 && tick.current <= 4
				const end = tick.current > 4
				setState({start, animate, end})
				tick.current = tick.current + 1
				if (tick.current % 6 === 0) {
					count.current = count.current + 1
					tick.current = 0
				}
			}, 500)
		}, 1000)
		return () => {
			// cleanup
			if (interval) clearInterval(interval)
			if (timeout) clearTimeout(timeout)
		}
	}, [])

	return (
		<Container
			style={{
				opacity: hide ? 0 : 1,
			}}
		>
			<Line
				style={{
					opacity: animate ? 1 : 0,
					transition: animate ? 'opacity 1000ms ease-in-out' : 'opacity 600ms ease-in-out'
				}}
				color={color}
			/>
			<Cursor
				style={{
					top: animate || end ? -24 : 43,
					right: animate || end ? -23 : 44,
					opacity: animate ? 1 : 0,
					transition: animate ? `top 600ms ease-in-out, right 600ms ease-in-out` : end ? 'opacity 600ms ease-in-out' : 'none',
				}}
				color={color}
			/>
			<Cursor
				style={{
					top: 43,
					right: 44,
					opacity: start ? 1 : 0,
					transition: !animate ? 'opacity 600ms ease-in-out' : 'none'
				}}
				color={color}
			/>
		</Container>

	)
}

export default InteractAnim