import {useContext} from 'react'
import {AppContext} from '../../../context'
import {Themes} from '../../../index'

const Shadow = () => {
	const {theme} = useContext(AppContext)
	return (
		<svg width="447" height="39" viewBox="0 0 447 39" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path style={{mixBlendMode: 'multiply'}}
			      d="M223.496 42.4448C346.93 42.4448 446.992 33.1212 446.992 21.62C446.992 10.1188 346.93 0.795288 223.496 0.795288C100.063 0.795288 0 10.1188 0 21.62C0 33.1212 100.063 42.4448 223.496 42.4448Z"
			      fill="url(#paint0_radial_11_811)" fillOpacity="0.5"/>
			<defs>
				<radialGradient id="paint0_radial_11_811" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
				                gradientTransform="translate(233.262 24.3863) rotate(-0.532735) scale(221.968 17.83)">
					<stop stopColor="#E3E3E3"/>
					<stop offset="0.24" stopColor={theme === Themes.DARK ? '#012D2D' : '#EAEAEA'}/>
					<stop offset="1" stopColor="white"/>
				</radialGradient>
			</defs>
		</svg>
	)
}

export default Shadow