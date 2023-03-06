import {Twitter} from '../icons'
import {connectedTwitterLink} from '../../../utils/share'
import {humanizeCount} from '../../../utils/humanize'
import styled from 'styled-components'

const Link = styled.a`
	display: flex;
	justify-content: center;
	align-items: center;
`
const TwitterLink = ({connections}: {connections: number}) => {
	return (
		<Link href={connectedTwitterLink(humanizeCount(connections))} target={'_blank'} rel="noreferrer" aria-label={'share on twitter'}>
			<Twitter />
		</Link>
	)
}

export default TwitterLink