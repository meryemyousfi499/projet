// setupTests.js
import '@testing-library/jest-dom';

// Supprime les warnings React inutiles dans les tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: An update to'))
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// __mocks__/styleMock.js
// module.exports = {};

// __mocks__/fileMock.js
// module.exports = 'test-file-stub';