import {createContext} from 'react'
import {defaultSettings, Settings} from '../constants'
import {WasmInterface} from '../utils/wasmInterface'

interface ContextInterface {
	width: number
	setWidth: (w: number) => void
	settings: Settings
	wasmInterface: WasmInterface
}
export const AppContext = createContext({
	width: 0,
	setWidth: (width: number) => {},
	settings: defaultSettings,
	wasmInterface: new WasmInterface()
} as ContextInterface)
export const AppContextProvider = AppContext.Provider