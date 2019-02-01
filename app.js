#!/usr/bin/env node

require('@babel/register')

require('dotenv/config')

const debug = require('debug')

const { readFile } = require('sacred-fs')

const { execute } = require('./src')

const commander = require('commander')

const app = async () => {
  const error = debug('minimserver:error')

  try {
    const {
      argv,
      env: {
        ORIGIN,
        DESTINATION,
        SERVER
      }
    } = process

    const {
      version
    } = JSON.parse(await readFile('./package.json', 'utf8'))

    commander
      .version(version)
      .option('-o, --origin [origin]', 'Origin path of M3Us')
      .option('-d, --destination [destination]', 'Destination path for M3Us')
      .option('-s, --server [server]', 'IP address or hostname and port')
      .parse(argv)

    const {
      origin = ORIGIN,
      destination = DESTINATION,
      server = SERVER
    } = commander

    const error = debug('minimserver:execute:error')

    try {
      await execute(origin, destination, server)
    } catch (e) {
      error(e)
    }
  } catch (e) {
    error(e)
  }
}

module.exports = app()
