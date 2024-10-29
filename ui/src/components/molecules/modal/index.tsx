import {Container, Frame, StyledButton, StyledLink, Text, Title} from './styles'
import {useContext, useState} from 'react'
import {AppContext} from '../../../context'
import {COLORS} from '../../../constants'
import {useTranslation} from 'react-i18next'
import {createPortal} from 'react-dom'


const Modal = ({ onIgnore, isCensored }: {onIgnore: () => void, isCensored: boolean}) => {
	const {t} = useTranslation()
	const { theme, layout, collapse } = useContext(AppContext).settings;
	const [show, setShow] = useState(true);

	const modalRoot = document.getElementById('geo-modal');

	if (collapse || !isCensored) return null;

	// Modal content to be rendered
	const modalContent = (
		<Container
			show={show}
			layout={layout}
			aria-hidden={!show}
			theme={theme}
		>
			<Frame>
				<div className={'header'}>
					<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
						<g clipPath="url(#clip0_2009_4740)">
							<path
								d="M12.5 2.86687C6.98 2.86687 2.5 7.34687 2.5 12.8669C2.5 18.3869 6.98 22.8669 12.5 22.8669C18.02 22.8669 22.5 18.3869 22.5 12.8669C22.5 7.34687 18.02 2.86687 12.5 2.86687ZM13.5 17.8669H11.5V15.8669H13.5V17.8669ZM13.5 13.8669H11.5V7.86687H13.5V13.8669Z"
								fill="#D5001F" />
						</g>
						<defs>
							<clipPath id="clip0_2009_4740">
								<rect width="24" height="24" fill="white" transform="translate(0.5 0.866867)" />
							</clipPath>
						</defs>
					</svg>
					<Title>{t('censoredTitle')}</Title>
				</div>
				<Text>{t('censoredMsg1')}</Text>
				<Text>{t('censoredMsg2')}</Text>
				<StyledLink href={'https://www.lantern.io/download'} target="_blank" rel="noreferrer">
					<Text style={{ color: COLORS.grey2, fontWeight: 500, fontSize: 16, lineHeight: '24px' }}>
						{t('censoredBtn')}
					</Text>
				</StyledLink>
				<StyledButton
					onClick={() => {
						setShow(false);
						onIgnore();
					}}
				>
					<Text style={{ color: COLORS.blue5, fontWeight: 500, fontSize: 16, lineHeight: '24px' }}>
						{t('censoredIgnore')}
					</Text>
				</StyledButton>
			</Frame>
		</Container>
	);

	return modalRoot ? createPortal(modalContent, modalRoot) : null;
};

export default Modal;