import debug from 'debug'

const {
  env: {
    DEBUG = '@sequencemedia/minimserver*'
  }
} = process

if (DEBUG) debug.enable(DEBUG)

export default debug
