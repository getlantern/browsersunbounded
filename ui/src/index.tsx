import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const p2pEmbeds = document.querySelectorAll("broflake") as NodeListOf<HTMLElement>;

export enum Layouts {
  'BANNER'= 'banner'
}

export enum Themes {
  'DARK' = 'dark',
  'LIGHT' = 'light'
}

export interface Dataset {
  features: string
}

export interface Settings {
  features: {
    globe: boolean
    toast: boolean
  }
  layout: Layouts
  theme: Themes
}

const defaultSettings: Settings = {
  features: {
    globe: true,
    toast: true,
  },
  layout: Layouts.BANNER,
  theme: Themes.LIGHT
}

p2pEmbeds.forEach((embed) => {
  const root = ReactDOM.createRoot(
    embed
  );
  const settings = {...defaultSettings}
  const dataset = embed.dataset as unknown as Dataset
  Object.keys(defaultSettings).forEach(key => {
    try {
      // @ts-ignore
      settings[key] = JSON.parse(dataset[key])
    } catch {
      // @ts-ignore
      settings[key] = dataset[key]
    }
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
