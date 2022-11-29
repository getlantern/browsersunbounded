import React from 'react'
import {render, screen} from '@testing-library/react'
import App from './App'
import {Layouts, Themes} from './index'

test('renders', () => {
  render(
    <App
      settings={{
        features: {
          globe: true,
          toast: true,
        },
        layout: Layouts.BANNER,
        theme: Themes.DARK
      }}
    />
  );
  const x = screen.getByText(/globe/i);
  expect(x).toBeInTheDocument();
});
