import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {settingsEmitter} from './index'
import Layout from './layout'
import Toast from './components/molecules/toast'
import Banner from './components/organisms/banner'
import Panel from './components/organisms/panel'
import usePageVisibility from './hooks/usePageVisibility'
import {useEmitterState} from './hooks/useStateEmitter'
import {sharingEmitter, WasmInterface} from './utils/wasmInterface'
import {isMobile} from './utils/isMobile'
import Editor from './components/organisms/editor'
import Floating from "./components/organisms/floating";
import Storage from './components/molecules/storage'
import useMessaging from './hooks/useMessaging'
import {Targets, Layouts} from './constants'
import {AppContextProvider} from './context'
import useAutoUpdate from './hooks/useAutoUpdate'

interface Props {
  appId: number
  embed: HTMLElement
}

const App = ({appId, embed}: Props) => {
  const isVisible = usePageVisibility()
  const sharing = useEmitterState(sharingEmitter)
  const settings = useEmitterState(settingsEmitter)[appId]
  const {mock, target} = settings
  const [mobileBg, desktopBg] = [settings.mobileBg, settings.desktopBg]
  const wasmInterface = useRef<WasmInterface>()
  const [width, setWidth] = useState(0)
  // setup app-wide listeners
  useMessaging()
  useAutoUpdate()

  useLayoutEffect(() => {
    if (wasmInterface.current) return // already initialized or initializing
    wasmInterface.current = new WasmInterface()
    wasmInterface.current.initialize({mock, target}).then(instance => {
        if (!instance) return
        console.log(`p2p ${mock ? '"wasm"' : 'wasm'} initialized!`)
        console.log('instance: ', instance)
      }
    )
  }, [mock, target])

  useEffect(() => {
    // If settings for running in bg are disabled, we will stop the wasm when page is not visible
    // for more than a minute. This is to prevent it from running in the background unintentionally
    // when the user has navigated away from the page.
    // On mobile, it's safe to assume if a timeout is still running in the background, so is the wasm.
    // So we can rely on the timeout to stop wasm, otherwise the OS has already suspended the both the
    // timeout and wasm process.
    let timeout: ReturnType<typeof setTimeout> | null = null
    const createTimeout = () => timeout = setTimeout(() => {
      wasmInterface.current && wasmInterface.current.stop()
    }, 1000 * 60)

    if (!isVisible && sharing) {
      if (isMobile && !mobileBg) createTimeout()
      else if (!isMobile && !desktopBg) createTimeout()
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isVisible, sharing, mobileBg, desktopBg])

  return (
    <AppContextProvider value={{width, setWidth, settings, wasmInterface: wasmInterface.current!}}>
      { settings.target !== Targets.EXTENSION_POPUP && <Storage /> }
      { settings.editor && <Editor embed={embed} /> }
      <Layout>
        <Toast />
        { settings.layout === Layouts.BANNER && (
          <Banner />
        )}
        { settings.layout === Layouts.PANEL && (
          <Panel />
        )}
        { settings.layout === Layouts.FLOATING && (
          <Floating />
        )}
      </Layout>
    </AppContextProvider>
  );
}

export default App
