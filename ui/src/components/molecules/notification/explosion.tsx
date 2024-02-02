import {LottieContainer, LottieWrapper} from './styles'
import Lottie, {LottieRefCurrentProps} from 'lottie-react'
import explosion from './explosion.json'
import {memo, MutableRefObject, useEffect, useRef} from 'react'

const Explosion = ({id}: {id: number}) => {
	const ref: MutableRefObject<LottieRefCurrentProps | null> = useRef(null);

	useEffect(() => {
		if (!ref.current) return
		if (id >= 0) {
			ref.current.goToAndPlay(0)
			console.log('play explosion')
		}
	}, [id])

	return (
		<LottieContainer>
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="27" viewBox="0 0 32 27" fill="none">
				<path d="M31.5035 5.87209C28.0938 -3.18494 17.0123 0.864084 16 5.3926C14.6148 0.597701 3.79965 -2.97183 0.496497 5.87209C-3.17959 15.7283 14.7214 24.5722 16 26.0107C17.2786 24.8386 35.1796 15.5684 31.5035 5.87209Z" fill="#FF5A79"/>
			</svg>
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

export default memo(Explosion, (prevProps, nextProps) => {
	return prevProps.id === nextProps.id
})