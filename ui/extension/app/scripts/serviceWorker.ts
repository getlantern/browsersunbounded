import {messageCheck} from '../../../src/utils/messages'
import {iconToggleSubscribe} from '../../utils'

console.log('service worker running')

const serviceWorkerApp = () => {
  // launch offscreen.html in a separate tab (background DOM process)
  chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('pages/offscreen.html'),
      // @ts-ignore
      reasons: ['WEB_RTC'],
      justification: 'offscreen.html used for WebRTC',
    },
    () => null
  )

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

chrome.runtime.onInstalled.addListener(serviceWorkerApp)
chrome.runtime.onStartup.addListener(serviceWorkerApp)