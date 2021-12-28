const presets = [
  [
    '@babel/env',
    {
      targets: {
        node: 'current'
      },
      useBuiltIns: 'usage',
      corejs: 3
    }
  ]
]

const plugins = []

module.exports = {
  compact: true,
  comments: false,
  presets,
  plugins
}
