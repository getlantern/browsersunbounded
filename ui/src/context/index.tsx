import {createContext} from 'react'

export const AppContext = createContext({
	width: 0,
	theme: 'light'
})
export const AppContextProvider = AppContext.Provider