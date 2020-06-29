#!/usr/bin/env node

require('@babel/register')

require('dotenv/config')

const debug = require('debug')

const psList = require('ps-list')

const {
  execute
} = require('./src')

const commander = require('commander')

const PACKAGE = require('./package')

const NAME = 'ms.App'
process.title = NAME

async function app () {
  const {
    name
  } = PACKAGE

  /**
   *  Permit only one instance of the application
   */
  try {
    const a = (await psList())
      .filter(({ name }) => name === NAME)

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

  try {
    commander
      .version(version, '-v, --version', 'Version')
      .exitOverride()
      .requiredOption('-o, --origin [origin]', 'Origin path of M3Us')
      .requiredOption('-d, --destination [destination]', 'Destination path for M3Us')
      .requiredOption('-s, --server [server]', 'Protocol, IP address or hostname, and port')
      .option('-i, --ignore [ignore]', 'Glob pattern of files to ignore')
      .parse(argv)
  } catch (e) {
    const {
      code
    } = e

    const error = debug('minimserver:commander:error')

    if (code !== 'commander.missingMandatoryOptionValue') error(e)

    error(`Halting application "${name}" in process ${pid}.`)
    return
  }

  const {
    origin = ORIGIN,
    destination = DESTINATION,
    server = SERVER,
    ignore = IGNORE
  } = commander

  log({
    origin,
    destination,
    server,
    ...(ignore ? { ignore } : {})
  })

  try {
    await execute(origin, destination, server, ignore)
  } catch ({ message }) {
    const error = debug('minimserver:execute:error')

    error(message)
  }
}

module.exports = app()
