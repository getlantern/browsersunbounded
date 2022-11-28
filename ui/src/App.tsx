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
import Banner from './components/organisms/banner'
import {COLORS} from './constants'
import Row from './components/atoms/row'

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
    <Layout
      layout={settings.layout}
    >
      { settings.features.toast && <Toast isSharing={isSharing} /> }
      {/*<Banner*/}
      {/*  isSharing={isSharing}*/}
      {/*  onShare={onShare}*/}
      {/*/>*/}
      {
        settings.features.globe && (
          <Col>
            <Globe isSharing={isSharing} />
          </Col>
        )
      }
      <Col>
        <Row
          borderTop
          borderBottom
          backgroundColor={COLORS.white}
        >
          <Control
            isSharing={isSharing}
            onShare={onShare}
          />
        </Row>
        <Stats isSharing={isSharing} />
        <About />
        <Footer />
      </Col>
    </Layout>
  );
}

export default App;
