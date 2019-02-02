#!/usr/bin/env node

require('@babel/register')

require('dotenv/config')

const psList = require('ps-list')

const debug = require('debug')

const {
  readFile
} = require('sacred-fs')

const {
  execute
} = require('./src')

const commander = require('commander')

const app = async () => {
  let p
  try {
    const s = await readFile('./package.json', 'utf8')
    p = JSON.parse(s)
  } catch ({ message }) {
    const error = debug('minimserver:error')

    error(message)
  }

  const {
    name
  } = p

  const NAME = 'ms.App'
  process.title = NAME

  /**
   *  Permit only one instance of the application
   */
  try {
    const a = (await psList()).filter(({ name }) => name === NAME)
    if (a.length > 1) {
      const {
        pid: PID
      } = process

      const {
        pid
      } = a.find(({ pid }) => pid !== PID)

      throw new Error(`Application "${name}" has already started in process ${pid}.`)
    }
  } catch ({ message }) {
    const error = debug('minimserver:error')

    error(message)
    return
  }

  const log = debug('minimserver:log')

  const {
    pid,
    argv,
    env: {
      ORIGIN,
      DESTINATION,
      SERVER,
      IGNORE
    }
  } = process

  log(`Starting application "${name}" in process ${pid}.`)

  const {
    version
  } = p

  commander
    .version(version)
    .option('-o, --origin [origin]', 'Origin path of M3Us')
    .option('-d, --destination [destination]', 'Destination path for M3Us')
    .option('-s, --server [server]', 'IP address or hostname, and port')
    .option('-i, --ignore [ignore]', 'Glob pattern of files to ignore')
    .parse(argv)

  const {
    origin = ORIGIN,
    destination = DESTINATION,
    server = SERVER,
    ignore = IGNORE
  } = commander

  try {
    await execute(origin, destination, server, ignore)
  } catch ({ message }) {
    const error = debug('minimserver:execute:error')

    error(message)
  }
}

module.exports = app()
