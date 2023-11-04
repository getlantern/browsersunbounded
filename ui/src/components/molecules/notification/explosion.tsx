import {LottieContainer, LottieWrapper} from './styles'
import Lottie, {LottieRefCurrentProps} from 'lottie-react'
import explosion from './explosion.json'
import {memo, MutableRefObject, useEffect, useRef} from 'react'

const Explosion = () => {
	const ref: MutableRefObject<LottieRefCurrentProps | null> = useRef(null);
	useEffect(() => {
		setTimeout(() => {
			ref.current?.play()
		}, 300) // wait for notification animation to finish
	}, [])
	return (
		<LottieContainer>
			<LottieWrapper>
				<Lottie
					autoplay={false}
					lottieRef={ref}
					animationData={explosion}
					loop={false}
				/>
			</LottieWrapper>
		</LottieContainer>
	)
};

export default memo(Explosion)