import React, {useEffect} from 'react'
import {Layouts, settingsEmitter} from './index'
import Layout from './layout'
import Toast from './components/molecules/toast'
import Banner from './components/organisms/banner'
import Panel from './components/organisms/panel'
import usePageVisibility from './hooks/usePageVisibility'
import {useEmitterState} from './hooks/useStateEmitter'
import {sharingEmitter, wasmInterface} from './utils/wasmInterface'
import {isMobile} from './utils/isMobile'
import Editor from './components/organisms/editor'
import Floating from "./components/organisms/floating";

interface Props {
  appId: number
  embed: HTMLElement
}

const App = ({appId, embed}: Props) => {
  const isVisible = usePageVisibility()
  const sharing = useEmitterState(sharingEmitter)
  const settings = useEmitterState(settingsEmitter)[appId]
  const [mobileBg, desktopBg] = [settings.mobileBg, settings.desktopBg]

  useEffect(() => {
    // If settings for running in bg are disabled, we will stop the wasm when page is not visible
    // for more than a minute. This is to prevent it from running in the background unintentionally
    // when the user has navigated away from the page.
    // On mobile, it's safe to assume if a timeout is still running in the background, so is the wasm.
    // So we can rely on the timeout to stop wasm, otherwise the OS has already suspended the both the
    // timeout and wasm process.
    let timeout: ReturnType<typeof setTimeout> | null = null
    const createTimeout = () => timeout = setTimeout(() => wasmInterface.stop(), 1000 * 60)

    if (!isVisible && sharing) {
      if (isMobile && !mobileBg) createTimeout()
      else if (!isMobile && !desktopBg) createTimeout()
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isVisible, sharing, mobileBg, desktopBg])

  return (
    <>
      { settings.editor && <Editor settings={settings} embed={embed} /> }
      <Layout
        theme={settings.theme}
        layout={settings.layout}
      >
        <Toast exit={settings.exit} />
        { settings.layout === Layouts.BANNER && (
          <Banner
            settings={settings}
          />
        )}
        { settings.layout === Layouts.PANEL && (
          <Panel
            settings={settings}
          />
        )}
        { settings.layout === Layouts.FLOATING && (
            <Floating
                settings={settings}
            />
        )}
      </Layout>
    </>

  );
}

export default App;
