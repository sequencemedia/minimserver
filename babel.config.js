const presets = [
  [
    '@babel/env',
    {
      useBuiltIns: 'usage',
      targets: {
        node: '12.9.0'
      },
      corejs: 3
    }
  ]
]

const plugins = [
  '@babel/proposal-export-default-from',
  '@babel/proposal-export-namespace-from',
  'syntax-async-functions',
  [
    'module-resolver', {
      root: ['./src'],
      cwd: 'babelrc',
      alias: {
        '~': './src'
      }
    }
  ]
]

module.exports = {
  compact: true,
  comments: false,
  presets,
  plugins
}
