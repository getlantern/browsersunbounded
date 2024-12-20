import React from 'react'
import {render, screen} from '@testing-library/react'
import App from './App'

test('renders', () => {
  render(
    <App
      appId={0}
      embed={document.createElement('div')}
    />
  );
  const x = screen.getByText(/globe/i);
  expect(x).toBeInTheDocument();
});
