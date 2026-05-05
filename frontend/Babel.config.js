module.exports = {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' },
      modules: 'commonjs'   // ← forcé en CommonJS
    }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};