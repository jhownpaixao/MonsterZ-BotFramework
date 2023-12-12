module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current'
        }
      }
    ],
    ['@babel/preset-typescript', { allowDeclareFields: true }]
  ],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@app': './src/app',
          '@services': './src/services',
          '@utils': './src/utils',
        }
      }
    ]
  ],
  ignore: ['**/*.spec.ts']
};
