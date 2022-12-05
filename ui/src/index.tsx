import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const broflakes = document.querySelectorAll("broflake") as NodeListOf<HTMLElement>;

export enum Layouts {
  'BANNER'= 'banner',
  'PANEL'= 'panel'
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
    'mobile-bg': boolean
    'desktop-bg': boolean
  }
  layout: Layouts
  theme: Themes
}

const defaultSettings: Settings = {
  features: {
    globe: true,
    toast: true,
    'mobile-bg': true,
    'desktop-bg': true
  },
  layout: Layouts.BANNER,
  theme: Themes.LIGHT
}

broflakes.forEach((embed) => {
  const root = ReactDOM.createRoot(
    embed
  );
  const settings = {...defaultSettings}
  const dataset = embed.dataset as unknown as Dataset
  Object.keys(defaultSettings).forEach(key => {
    try {
      // @ts-ignore
      settings[key] = {...settings[key], ...JSON.parse(dataset[key])}
    } catch {
      // @ts-ignore
      settings[key] = dataset[key] || settings[key]
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
