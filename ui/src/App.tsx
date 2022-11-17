import React, {useState} from 'react'
import {Settings} from './index'
import Layout from './layout'
import Stats from './components/molecules/stats'
import Globe from './components/molecules/globe'
import Col from './components/atoms/col'
import About from './components/molecules/about'
import Control from './components/molecules/control'
import Footer from './components/molecules/footer'
import Toast from './components/molecules/toast'
import {wasmInterface} from './utils/wasmInterface'

export interface AppState {
  isSharing: boolean
}

interface Props {
  settings: Settings
}

const App = ({settings}: Props) => {
  const [state, setState] = useState<AppState>({
    isSharing: false,
  })

  const onShare = (isSharing: boolean) => {
    setState({...state, isSharing})
    if (isSharing) wasmInterface.start()
    if (!isSharing) wasmInterface.stop()
  }
  const {isSharing} = state

  return (
    <Layout>
      { settings.features.toast && <Toast isSharing={isSharing} /> }
      <Col>
        <Control
          isSharing={isSharing}
          onShare={onShare}
        />
        { settings.features.stats && <Stats isSharing={isSharing} /> }
        { settings.features.about && <About /> }
        <Footer />
      </Col>
      {
        settings.features.globe && (
          <Col>
            <Globe isSharing={isSharing} />
          </Col>
        )
      }
    </Layout>
  );
}

export default App;
