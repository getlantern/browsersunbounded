import {createContext} from 'react'

export const AppWidth = createContext({
	width: 0,
})
export const AppWidthProvider = AppWidth.Provider