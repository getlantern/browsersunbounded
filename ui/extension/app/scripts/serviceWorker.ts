import {messageCheck} from '../../../src/utils/messages'
import {iconToggleSubscribe} from '../../utils'

console.log('service worker running')

const state = {
  booted: false,
}

const createOffscreenDocument = () => {
  return new Promise((resolve, reject) => {
    chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('pages/offscreen.html'),
      // @ts-ignore
      reasons: ['WEB_RTC'],
      justification: 'offscreen.html used for WebRTC',
    }).then(resolve).catch(e => reject(e))
  })
}

const serviceWorkerApp = () => {
  state.booted = true // set booted flag to true

  // launch offscreen.html in a separate tab (background DOM process)
  // https://groups.google.com/a/chromium.org/g/chromium-extensions/c/D5Jg2ukyvUc
  createOffscreenDocument().then(() => {}).catch(e => console.error(e))

  // subscribe to messages from offscreen to forward to popup iframe
  chrome.runtime.onMessage.addListener((message) => {
    if (messageCheck(message)) {
      // toggle icon based on sharing status messages from offscreen
      // this only runs on chrome since firefox doesn't support service workers yet
      // in firefox, the icon is toggled in the offscreen.ts file which is the 'background' script
      iconToggleSubscribe(message, false)
      return false
    }
  })
}

// run on startup (this should handle most cases)
chrome.runtime.onInstalled.addListener(serviceWorkerApp)
chrome.runtime.onStartup.addListener(serviceWorkerApp)

// this handles edge cases where the service worker is not booted on startup
// see https://stackoverflow.com/questions/13979781/chrome-extension-how-to-handle-disable-and-enable-event-from-browser
// choosing this method instead of requesting the 'management' permission
setTimeout(() => {
  if (!state.booted) serviceWorkerApp()
}, 500)