chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['WEB_RTC'],
        justification: 'offscreen.html used for WebRTC',
    },
    () => null
)