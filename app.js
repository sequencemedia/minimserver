#!/usr/bin/env node

require('@babel/register')

require('dotenv/config')

const {
  readFile
} = require('sacred-fs')

const debug = require('debug')

const psList = require('ps-list')

const {
  execute
} = require('./src')

const commander = require('commander')

const NAME = 'ms.App'
process.title = NAME

const app = async () => {
  let PACKAGE
  try {
    const s = await readFile('./package.json', 'utf8')
    PACKAGE = JSON.parse(s)
  } catch ({ message }) {
    const error = debug('minimserver:error')

    error(message)
  }

  const {
    name
  } = PACKAGE

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

      const log = debug('minimserver:process:log')

      log(`Killing application "${name}" in process ${pid}.`)

      process.kill(pid)
    }
  } catch ({ message }) {
    const error = debug('minimserver:process:error')

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
  } = PACKAGE

  commander
    .version(version)
    .option('-o, --origin [origin]', 'Origin path of M3Us')
    .option('-d, --destination [destination]', 'Destination path for M3Us')
    .option('-s, --server [server]', 'Protocol, IP address or hostname, and port')
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
