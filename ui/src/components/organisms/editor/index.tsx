import {useEffect, useState} from 'react'
import {Layouts, Settings, Themes} from '../../../index'
import {StyledEditor} from './styles'

interface Props {
	settings: Settings
	embed: HTMLElement
}
const Editor = ({settings, embed}: Props) => {
	const [state, setState] = useState(settings)

	useEffect(() => {
		Object.keys(state).forEach(key => {
			// @ts-ignore
			embed.dataset[key] = state[key]
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state])

	return (
		<StyledEditor>
			<fieldset>
				<legend>Layout</legend>
				<div>
					<input
						type="radio"
						id={Layouts.BANNER}
						name="layout"
						value={Layouts.BANNER}
						checked={state.layout === Layouts.BANNER}
						onChange={() => setState({...state, layout: Layouts.BANNER})}
					/>
					<label htmlFor={Layouts.BANNER}>Banner</label>
				</div>

				<div>
					<input
						type="radio"
						id={Layouts.PANEL}
						name="layout"
						value={Layouts.PANEL}
						checked={state.layout === Layouts.PANEL}
						onChange={() => setState({...state, layout: Layouts.PANEL})}
					/>
					<label htmlFor={Layouts.PANEL}>Panel</label>
				</div>
			</fieldset>
			<fieldset>
				<legend>Theme</legend>
				<div>
					<input
						type="radio"
						id={Themes.DARK}
						name="theme"
						value={Themes.DARK}
						checked={state.theme === Themes.DARK}
						onChange={() => setState({...state, theme: Themes.DARK})}
					/>
					<label htmlFor={Themes.DARK}>Dark</label>
				</div>

				<div>
					<input
						type="radio"
						id={Themes.LIGHT}
						name="theme"
						value={Themes.LIGHT}
						checked={state.theme === Themes.LIGHT}
						onChange={() => setState({...state, theme: Themes.LIGHT})}
					/>
					<label htmlFor={Themes.LIGHT}>Light</label>
				</div>
			</fieldset>
			<fieldset>
				<legend>Features</legend>
				<div>
					<input
						type="checkbox"
						id="globe"
						name="globe"
						checked={state.globe}
						onChange={e => setState({...state, globe: e.target.checked})}
					/>
						<label htmlFor="globe">Globe</label>
				</div>

				<div>
					<input
						type="checkbox"
						id="exit"
						name="exit"
						checked={state.exit}
						onChange={e => setState({...state, exit: e.target.checked})}
					/>
					<label htmlFor="exit">Exit notification</label>
				</div>

				<div>
					<input
						type="checkbox"
						id="mobileBg"
						name="mobileBg"
						checked={state.mobileBg}
						onChange={e => setState({...state, mobileBg: e.target.checked})}
					/>
					<label htmlFor="mobileBg">Mobile background</label>
				</div>

				<div>
					<input
						type="checkbox"
						id="desktopBg"
						name="desktopBg"
						checked={state.desktopBg}
						onChange={e => setState({...state, desktopBg: e.target.checked})}
					/>
					<label htmlFor="desktopBg">Desktop background</label>
				</div>

				<div>
					<input
						type="checkbox"
						id="donate"
						name="donate"
						checked={state.donate}
						onChange={e => setState({...state, donate: e.target.checked})}
					/>
					<label htmlFor="donate">Donate</label>
				</div>

				<div>
					<input
						type="checkbox"
						id="editor"
						name="editor"
						checked={state.editor}
						onChange={e => setState({...state, editor: e.target.checked})}
					/>
					<label htmlFor="editor">Editor</label>
				</div>
			</fieldset>
		</StyledEditor>
	)
}

export default Editor