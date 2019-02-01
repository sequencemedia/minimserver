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
  copyFile
} from 'sacred-fs'

import chokidar from 'chokidar'
import rimraf from 'rimraf'
import del from 'del'
import debug from 'debug'

const error = debug('minimserver:error')
const log = debug('minimserver:log')

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

    try {
      await ensureDestinationM3U(to)
      await copyFile(filePath, to)
    } catch (e) {
      error(e)
    }
  }
}

function unlinkFactory (origin, destination) {
  return async function (filePath) {
    const to = filePath.replace(origin, destination)

    try {
      await del(to, { force: true })
    } catch (e) {
      error(e)
    }
  }
}

function rescanQueueFactory (server) {
  let timeout

  return function () {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(async () => {
      const response = await rescan(server)

      log('queue', response.trim())
    }, 250)
  }
}

export async function execute (origin, destination, server) {
  let watcher
  try {
    const o = path.resolve(origin.replace('~', os.homedir))
    const d = path.resolve(destination.replace('~', os.homedir))

    watcher = chokidar.watch(o, { ignored: /(^|[/\\])\../ })

    const create = createFactory(o, d)
    const unlink = unlinkFactory(o, d)

    await ensureDestinationDir(d)
    await removeAllM3UFromDestinationDir(d)

    watcher
      .on('add', create)
      .on('change', create)
      .on('unlink', unlink)
      .on('ready', async () => {
        watcher
          .off('add', create)
          .off('change', create)
          .off('unlink', unlink)

        const rescanQueue = rescanQueueFactory(server)

        watcher
          .on('add', async (filePath) => {
            try {
              await create(filePath)
              rescanQueue()
            } catch (e) {
              error(e)
            }
          })
          .on('change', async (filePath) => {
            try {
              await create(filePath)
              rescanQueue()
            } catch (e) {
              error(e)
            }
          })
          .on('unlink', async (filePath) => {
            try {
              await unlink(filePath)
              rescanQueue()
            } catch (e) {
              error(e)
            }
          })

        try {
          const response = await rescan(server)

          log(response.trim())
        } catch (e) {
          error(e)
        }
      })
  } catch (e) {
    if (watcher) watcher.close()

    error(e)
  }
}
