import {Container, Frame, StyledButton, StyledLink, Text, Title} from './styles'
import {useContext, useState} from 'react'
import {AppContext} from '../../../context'
import {COLORS} from '../../../constants'
import {useTranslation} from 'react-i18next'

const Modal = () => {
	const {t} = useTranslation()
	const {theme, layout, collapse} = useContext(AppContext).settings
	const [show, setShow] = useState(true)

	// @todo the modal does not fit the design system for collapsed states
	if (collapse) return null;

	return (
		<Container
			show={show}
			layout={layout}
			aria-hidden={!show}
			theme={theme}
			// onTouchStart={() => setShow(false)}
			// onMouseDown={() => setShow(false)}
			// onClick={() => setShow(false)}
		>
			<Frame>
				<div className={'header'}>
					<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
						<g clipPath="url(#clip0_2009_4740)">
							<path
								d="M12.5 2.86687C6.98 2.86687 2.5 7.34687 2.5 12.8669C2.5 18.3869 6.98 22.8669 12.5 22.8669C18.02 22.8669 22.5 18.3869 22.5 12.8669C22.5 7.34687 18.02 2.86687 12.5 2.86687ZM13.5 17.8669H11.5V15.8669H13.5V17.8669ZM13.5 13.8669H11.5V7.86687H13.5V13.8669Z"
								fill="#D5001F"/>
						</g>
						<defs>
							<clipPath id="clip0_2009_4740">
								<rect width="24" height="24" fill="white" transform="translate(0.5 0.866867)"/>
							</clipPath>
						</defs>
					</svg>
					<Title>
						Switch to Lantern
					</Title>
				</div>
				<Text>
					{/*{t('keep')}*/}
					Browsers Unbounded is not available to users in censored countries.
				</Text>
				<Text>
					{/*{t('keep')}*/}
					Download Lantern to access blocked sites and apps.
				</Text>
				<StyledLink
					href={'https://www.lantern.io/download'}
					target="_blank"
					rel="noreferrer"
				>
					<Text
						style={{
							color: COLORS.grey2,
							fontWeight: 500,
							fontSize: 16,
							lineHeight: '24px',
						}}
					>
						Download Lantern
					</Text>
				</StyledLink>
				<StyledButton
					onClick={() => setShow(false)}
				>
					<Text
						style={{
							color: COLORS.blue5,
							fontWeight: 500,
							fontSize: 16,
							lineHeight: '24px',
						}}
					>
						Ignore
					</Text>
				</StyledButton>
			</Frame>
		</Container>
	)
}

export default Modal