import os from 'os'
import path from 'path'
import {
  exec
} from 'child_process'

import {
  ensureDir,
  ensureFile
} from 'fs-extra'

import {
  stat,
  copyFile
} from 'sacred-fs'

import chokidar from 'chokidar'
import anymatch from 'anymatch'
import rimraf from 'rimraf'
import del from 'del'
import debug from 'debug'

const error = debug('minimserver:error')
const log = debug('minimserver:log')

async function originDirExists (path) {
  try {
    await stat(path)
    return true
  } catch ({ code, ...e }) {
    if (code !== 'ENOENT') {
      const {
        message
      } = e

      error(message)
    }
    return false
  }
}

const removeAllM3UFromDestinationDir = (path) => (
  new Promise((resolve, reject) => {
    rimraf(path, (e) => (!e) ? resolve() : reject(e))
  })
)

const ensureDestinationDir = (path) => (
  new Promise((resolve, reject) => {
    ensureDir(path, (e) => (!e) ? resolve() : reject(e))
  })
)

const ensureDestinationM3U = (filePath) => (
  new Promise((resolve, reject) => {
    ensureFile(filePath, (e) => (!e) ? resolve() : reject(e))
  })
)

export const rescan = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d rescan`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

export const restart = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d restart`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

export const relaunch = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d relaunch`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

export const exit = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d exit`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

function createFactory (origin, destination) {
  return async function (filePath) {
    const to = filePath.replace(origin, destination)

    log('create', to)

    try {
      await ensureDestinationM3U(to)
      await copyFile(filePath, to)
    } catch ({ message }) {
      error(message)
    }
  }
}

function changeFactory (origin, destination) {
  return async function (filePath) {
    const to = filePath.replace(origin, destination)

    log('change', to)

    try {
      await ensureDestinationM3U(to)
      await copyFile(filePath, to)
    } catch ({ message }) {
      error(message)
    }
  }
}

function removeFactory (origin, destination) {
  return async function (filePath) {
    const to = filePath.replace(origin, destination)

    log('remove', to)

    try {
      await del(to, { force: true })
    } catch ({ message }) {
      error(message)
    }
  }
}

function queueRescanFactory (server) {
  let timeout

  return function () {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(async () => {
      try {
        const response = await rescan(server)

        log('queue', response.trim())
      } catch ({ message }) {
        error(message)
      }
    }, 9999)
  }
}

function ignorePatternFactory (ignore) {
  const ignorePatterns = ignore.split(',')

  return function (filePath) {
    return /(^|[/\\])\../.test(filePath) || anymatch(ignorePatterns, filePath)
  }
}

export async function execute (
  origin = '.',
  destination = '.',
  server = 'http://0.0.0.0:9790',
  ignore = ''
) {
  let watcher

  try {
    const o = path.resolve(origin.replace('~', os.homedir))

    if (!await originDirExists(o)) throw new Error(`Origin ${origin} does not exist.`)

    const d = path.resolve(destination.replace('~', os.homedir))
    const ignorePattern = ignorePatternFactory(ignore)

    watcher = chokidar.watch(o, { ignored: ignorePattern })

    const create = createFactory(o, d)
    const change = changeFactory(o, d)
    const remove = removeFactory(o, d)

    await ensureDestinationDir(d)
    await removeAllM3UFromDestinationDir(d)

    const queueRescan = queueRescanFactory(server)

    watcher
      .on('add', async function (filePath) {
        try {
          await create(filePath)

          queueRescan()
        } catch ({ message }) {
          error(message)
        }
      })
      .on('change', async function (filePath) {
        try {
          await change(filePath)

          queueRescan()
        } catch ({ message }) {
          error(message)
        }
      })
      .on('unlink', async function (filePath) {
        try {
          await remove(filePath)

          queueRescan()
        } catch ({ message }) {
          error(message)
        }
      })
      .on('error', ({ message }) => {
        error('Error in watcher', message)
      })

    queueRescan()
  } catch ({ message }) {
    if (watcher) watcher.close()

    error(message)
  }
}
