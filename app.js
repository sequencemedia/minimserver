#!/usr/bin/env node

require('@babel/register')

require('dotenv/config')

const debug = require('debug')

const { readFile } = require('sacred-fs')

const { execute } = require('./src')

const commander = require('commander')

const app = async () => {
  const error = debug('itunes-library:error')

  try {
    const {
      argv,
      env: {
        ORIGIN,
        SERVER,
        DESTINATION
      }
    } = process

    const {
      version
    } = JSON.parse(await readFile('./package.json', 'utf8'))

    commander
      .version(version)
      .option('-o, --origin [origin]', 'Origin path of M3Us')
      .option('-s, --server [server]', 'IP address or hostname and port')
      .option('-d, --destination [destination]', 'Destination path for M3Us')
      .parse(argv)

    const {
      origin = ORIGIN,
      server = SERVER,
      destination = DESTINATION
    } = commander

    const error = debug('itunes-library:execute:error')

    try {
      await execute(origin, server, destination)
    } catch (e) {
      error(e)
    }
  } catch (e) {
    error(e)
  }
}

module.exports = app()
