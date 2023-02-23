const SIGNATURE = 'lanternNetwork'
const POPUP = 'popup'
let popupOpen = false

interface Message {
    type: string
    data: {}
    signature: string
}
const messageCheck = (message: Message) => (typeof message === 'object' && message !== null && message.hasOwnProperty(SIGNATURE))
const bind = () => {
    const id = document.getElementById('window-id')?.dataset?.id
    const isPopup = id === POPUP
    if (isPopup) chrome.runtime.connect({'name': id})
    else chrome.runtime.onConnect.addListener((port) => {
        if (port.name === POPUP) port.onDisconnect.addListener(() => {
            popupOpen = false
        })
        return false
    })
    const iframe = document.getElementsByTagName('iframe')[0]
    chrome.runtime.onMessage.addListener((message) => {
        if (!messageCheck(message)) return
        if (message.type === 'popupOpened') return popupOpen = true
        // console.log('message from chrome, forwarding to iframe: ', message)
        iframe.contentWindow?.postMessage(message, '*')

        if (isPopup && message.type === 'stateUpdate' && message.data.emitter === 'sharingEmitter') {
            const state = message.data.value ? 'on' : 'off'
            chrome.action.setIcon({
                path: {
                    "16": `/images/logo16_${state}.png`,
                    "32": `/images/logo32_${state}.png`,
                    "48": `/images/logo48_${state}.png`,
                    "128": `/images/logo128_${state}.png`
                }
            })
        }
        return false
    })
    if (isPopup) chrome.runtime.sendMessage({
        type: 'popupOpened',
        [SIGNATURE]: true,
        data: {}
    })
    window.addEventListener('message', event => {
        const message = event.data
        if (!messageCheck(message)) return
        // console.log('message from iframe, forwarding to chrome: ', message)
        if (isPopup || popupOpen) chrome.runtime.sendMessage(message)
    })
}

window.addEventListener('load', bind)