import '@testing-library/jest-dom';

// Supprimer les warnings React Router
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('React Router')) return;
    originalWarn(...args);
  };
  console.error = (...args) => {
    if (typeof args[0] === 'string' && (
      args[0].includes('not wrapped in act') ||
      args[0].includes('defaultProps') ||
      args[0].includes('punycode')
    )) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});