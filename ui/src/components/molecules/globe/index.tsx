// @ts-nocheck @todo add types
/***
	This uses https://github.com/vasturiano/react-globe.gl to bootstrap the webgl globe for prototype/iteration.
	Ideally once we've tuned it to our liking - this should be build bespoke using three.js for decreased bundle
	size and better performance.

	Also see the patches dir for changes to the shader program that are not exposed through the react-globe api.
***/
import GlobeComponent from 'react-globe.gl' // @todo lazy load
import {Container} from './styles'
import {useContext, useEffect, useRef, useState} from 'react'
import {AppWidth} from '../../../context'
import {BREAKPOINT, COLORS, UV_MAP_PATH} from '../../../constants'
import Shadow from './shadow'
import Tip from '../tip'
import {useGeo} from '../../../hooks/useGeo'
import {mockLoc} from '../../../mocks/mockData'

const Globe = ({isSharing}: {isSharing: boolean}) => {
	const {width} = useContext(AppWidth)
	const size = width < BREAKPOINT ? 300 : 400
	const isSetup = useRef(false)
	const [arc, setArc] = useState(null)
	const globe = useRef()
	const container = useRef()
	const {arcs, points} = useGeo()

	useEffect(() => {
		if (isSharing) {
			globe.current.pointOfView({
				lat: 20, // equator
				lng: mockLoc[0], // @todo use user loc
				altitude: 2.5,
			}, 1000)
		}
	}, [arcs, isSharing])

	useEffect(() => {
		const controls = globe.current.controls()
		controls.autoRotate = !arc
	}, [arc])

	const setUp = () => {
		if (isSetup.current) return
		isSetup.current = true
		const controls = globe.current.controls()
		const camera = globe.current.camera()
		const scene = globe.current.scene()
		controls.autoRotate = true
		controls.autoRotateSpeed = 1
		const directionalLight = scene.children.find(obj3d => obj3d.type === 'DirectionalLight')
		if (directionalLight) directionalLight.intensity = .25
		const clonedLight = directionalLight.clone()
		clonedLight.position.set(0, 500, 0)
		camera.add(clonedLight)
		scene.add(camera)
		scene.remove(directionalLight)
	}

	// useEffect(() => {
	// 	const animate = () => {
	// 		requestAnimationFrame(animate)
	// 		const scene = globe.current.scene()
	// 		const fromKapsule = scene.children.find(obj3d => obj3d.type === 'Group')
	// 		if (!fromKapsule) return
	// 		const lineSegmentGroups = fromKapsule.children[0].children
	// 		lineSegmentGroups.forEach(group => {
	// 			const lineSegments = group.children.find(obj3d => obj3d.type === 'LineSegments')
	// 			if (lineSegments) {
	// 				// @todo
	// 			}
	// 		})
	// 	}
	// 	animate()
	// }, [])

	return (
		<>
			<Container
				ref={container}
			>
				<GlobeComponent
					ref={globe}
					onGlobeReady={setUp}
					width={size}
					height={size}
					enablePointerInteraction={true}
					waitForGlobeReady={true}
					showAtmosphere={true}
					atmosphereColor={COLORS.brand}
					atmosphereAltitude={.25}
					backgroundColor={COLORS.veryLightGrey}
					globeImageUrl={UV_MAP_PATH}
					arcsData={arcs}
					arcColor={['rgba(0, 188, 212, 0.75)', 'rgba(255, 193, 7, 0.75)']}
					arcDashLength={1}
					arcDashGap={0.5}
					arcDashInitialGap={1}
					arcDashAnimateTime={500}
					arcsTransitionDuration={0}
					arcStroke={2.5}
					arcAltitudeAutoScale={0.3}
					onArcHover={setArc}
					pointsData={points}
					pointColor={() => COLORS.green}
					pointRadius={1.5}
					pointAltitude={0}
					pointsTransitionDuration={500}
					// ringsData={points}
					// ringColor={() => COLORS.green}
					// ringMaxRadius={5}
					// ringPropagationSpeed={2}
					// ringRepeatPeriod={500}
				/>
				<Shadow />
			</Container>
			<Tip
				text={!!arc && `${arc.count} People from ${arc.country}`}
				show={!!arc}
				container={container}
			/>
		</>

	)
}

export default Globe