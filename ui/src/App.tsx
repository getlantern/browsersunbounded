import React from 'react'
import {Layouts, Settings} from './index'
import Layout from './layout'
import Toast from './components/molecules/toast'
import Banner from './components/organisms/banner'

export interface AppState {
  isSharing: boolean
}

interface Props {
  settings: Settings
}

const App = ({settings}: Props) => {
  return (
    <Layout
      layout={settings.layout}
      theme={settings.theme}
    >
      { settings.features.toast && <Toast /> }
      { settings.layout === Layouts.BANNER && (
        <Banner
          settings={settings}
        />
      )}
    </Layout>
  );
}

export default App;
