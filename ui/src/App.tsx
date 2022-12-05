import React, {useEffect} from 'react'
import {Layouts, Settings} from './index'
import Layout from './layout'
import Toast from './components/molecules/toast'
import Banner from './components/organisms/banner'
import Panel from './components/organisms/panel'
import usePageVisibilty from './hooks/usePageVisibilty'
import {useEmitterState} from './hooks/useStateEmitter'
import {sharingEmitter, wasmInterface} from './utils/wasmInterface'
import {isMobile} from './utils/isMobile'

export interface AppState {
  isSharing: boolean
}

interface Props {
  settings: Settings
}

const App = ({settings}: Props) => {
  const isVisible = usePageVisibilty()
  const sharing = useEmitterState(sharingEmitter)
  const [mobileBg, desktopBg] = [settings.features['mobile-bg'], settings.features['mobile-bg']]

  useEffect(() => {
    if (!isVisible && sharing) {
      if (isMobile && !mobileBg) wasmInterface.stop()
      else if (!isMobile && !desktopBg) wasmInterface.stop()
    }
  }, [isVisible, sharing, mobileBg, desktopBg])

  return (
    <Layout
      theme={settings.theme}
      layout={settings.layout}
    >
      { settings.features.toast && <Toast /> }
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
    </Layout>
  );
}

export default App;
