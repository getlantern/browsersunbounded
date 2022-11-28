import React from 'react'
import {render, screen} from '@testing-library/react'
import App from './App'
import {Layouts} from './index'

test('renders', () => {
  render(
    <App
      settings={{
        features: {
          globe: true,
          toast: true,
        },
        layout: Layouts.BANNER
      }}
    />
  );
  const x = screen.getByText(/globe/i);
  expect(x).toBeInTheDocument();
});
