const launchOffscreen = () => {
  chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('pages/offscreen.html'),
      // @ts-ignore
      reasons: ['WEB_RTC'],
      justification: 'offscreen.html used for WebRTC',
    },
    () => null
  )
}

chrome.runtime.onInstalled.addListener(launchOffscreen)
chrome.runtime.onStartup.addListener(launchOffscreen)