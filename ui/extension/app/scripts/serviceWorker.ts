try {
  chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('pages/offscreen.html'),
      // @ts-ignore
      reasons: ['WEB_RTC'],
      justification: 'offscreen.html used for WebRTC',
    },
    () => null
  )
} catch (e) {
  console.error(e)
}