import {SIGNATURE} from '../constants'

export const messageCheck = (message: MessageEvent['data']) => (typeof message === 'object' && message !== null && message.hasOwnProperty(SIGNATURE))