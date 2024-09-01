#!/usr/bin/env node

import 'dotenv/config'

import debug from 'debug'

import {
  readFile
} from 'node:fs/promises'

import psList from 'ps-list'

import {
  Command
} from 'commander'

import minimServer from './src/index.mjs'

const {
  env: {
    DEBUG = 'sequencemedia/minimserver*'
  }
} = process

if (DEBUG) debug.enable(DEBUG)

const log = debug('@sequencemedia/minimserver')

log('`minimserver` is awake')

const NAME = 'ms.App'
process.title = NAME

const commander = new Command()

async function app () {
  const PACKAGE = JSON.parse(await readFile('./package.json', 'utf8'))

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

      const log = debug('@sequencemedia/minimserver:process')

      log(`Killing application "${name}" in process ${pid}.`)

      process.kill(pid)
    }
  } catch ({ message }) {
    const error = debug('@sequencemedia/minimserver:process:error')

    error(message)
    return
  }

  const {
    pid,
    argv,
    env: {
      IGNORE,
      BOUNCE
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
      .option('-b, --bounce [bounce]', 'Bounce after delay (in milliseconds)')
      .parse(argv)
  } catch (e) {
    const {
      code
    } = e

    const error = debug('@sequencemedia/minimserver:commander:error')

    if (code !== 'commander.missingMandatoryOptionValue') error(e)

    error(`Halting application "${name}" in process ${pid}.`)
    return
  }

  const {
    origin,
    destination,
    server,
    ignore = IGNORE,
    bounce = BOUNCE
  } = commander.opts()

  log({
    origin,
    destination,
    server,
    ...(ignore ? { ignore } : {}),
    ...(bounce ? { bounce } : {})
  })

  try {
    await minimServer(origin, destination, server, ignore, bounce)
  } catch ({ message }) {
    const error = debug('@sequencemedia/minimserver:error')

    error(message)
  }
}

export default app()
