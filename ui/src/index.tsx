import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const p2pEmbeds = document.querySelectorAll("lantern-p2p-proxy") as NodeListOf<HTMLElement>;

export interface Dataset {
  features: string
}

export interface Settings {
  features: {
    globe: boolean
    stats: boolean
    about: boolean
    toast: boolean
  }
}

const defaultSettings: Settings = {
  features: {
    globe: true,
    stats: true,
    about: true,
    toast: true
  }
}

p2pEmbeds.forEach((embed) => {
  const root = ReactDOM.createRoot(
    embed
  );
  const settings = {...defaultSettings}
  const dataset = embed.dataset as unknown as Dataset
  Object.keys(defaultSettings).forEach(key => {
    // @ts-ignore
    settings[key] = JSON.parse(dataset[key]) //@todo try catch
  })
  root.render(
    <React.StrictMode>
      <App
        settings={settings}
      />
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
