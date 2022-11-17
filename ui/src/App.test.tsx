import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders', () => {
  render(
    <App
      settings={{
        features: {
          globe: true,
          stats: true,
          about: true,
          toast: true
        }
      }}
    />
  );
  const x = screen.getByText(/globe/i);
  expect(x).toBeInTheDocument();
});
