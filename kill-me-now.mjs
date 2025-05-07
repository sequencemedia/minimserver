#!/usr/bin/env node

import debug from 'debug'

import killMeNow from 'kill-me-now'

import hereIAm from '#where-am-i'

const {
  env: {
    DEBUG = '@sequencemedia/minimserver*'
  }
} = process

if (DEBUG) debug.enable(DEBUG)

const {
  pid
} = process

const log = debug('@sequencemedia/minimserver:kill-me-now')

log('`minimserver` is awake')

export default killMeNow(hereIAm, pid, 'node')
