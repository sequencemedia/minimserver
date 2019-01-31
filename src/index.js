import os from 'os'
import path from 'path'
import {
  exec
} from 'child_process'

import chokidar from 'chokidar'

import {
  ensureFile
} from 'fs-extra'

import {
  copyFile
} from 'sacred-fs'

import rimraf from 'rimraf'
import del from 'del'
import debug from 'debug'

const error = debug('minimserver:error')
const log = debug('minimserver:log')

const remove = (path) => (
  new Promise((resolve, reject) => {
    rimraf(path, (e) => (!e) ? resolve() : reject(e))
  })
)

const ensure = (filePath) => (
  new Promise((resolve, reject) => {
    ensureFile(filePath, (e) => (!e) ? resolve() : reject(e))
  })
)

export const rescan = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" http://${server} -d rescan`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

export const restart = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" http://${server} -d restart`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

export const relaunch = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" http://${server} -d relaunch`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

export const exit = (server) => (
  new Promise((resolve, reject) => {
    exec(`curl -X POST -H "Content-Type: text/plain" http://${server} -d exit`, (e, r) => (!e) ? resolve(r) : reject(e))
  })
)

const createFactory = (origin, destination) => async (filePath) => {
  const to = filePath.replace(origin, destination)

  // log(to)

  try {
    await ensure(to)
    await copyFile(filePath, to)
  } catch (e) {
    error(e)
  }
}

const unlinkFactory = (origin, destination) => async (filePath) => {
  const to = filePath.replace(origin, destination)

  // log(to)

  try {
    await del(to, { force: true })
  } catch (e) {
    error(e)
  }
}

export async function execute (origin, server, destination) {
  let watcher
  try {
    const o = path.resolve(origin.replace('~', os.homedir))
    const d = path.resolve(destination.replace('~', os.homedir))

    watcher = chokidar.watch(o, { ignored: /(^|[/\\])\../ })

    await remove(d)

    const create = createFactory(o, d)
    const unlink = unlinkFactory(o, d)

    watcher
      .on('add', create)
      .on('change', create)
      .on('unlink', unlink)
      .on('ready', async () => {
        watcher
          .off('add', create)
          .off('change', create)
          .off('unlink', unlink)

        let t

        try {
          const response = await rescan(server)

          log(response.trim())

          watcher
            .on('add', async (filePath) => {
              try {
                await create(filePath)

                if (t) clearTimeout(t)
                t = setTimeout(async () => {
                  const response = await rescan(server)

                  log('add', response.trim())
                }, 250)
              } catch (e) {
                error(e)
              }
            })
            .on('change', async (filePath) => {
              try {
                await create(filePath)

                if (t) clearTimeout(t)
                t = setTimeout(async () => {
                  const response = await rescan(server)

                  log('change', response.trim())
                }, 250)
              } catch (e) {
                error(e)
              }
            })
            .on('unlink', async (filePath) => {
              try {
                await unlink(filePath)

                if (t) clearTimeout(t)
                t = setTimeout(async () => {
                  const response = await rescan(server)

                  log('unlink', response.trim())
                }, 250)
              } catch (e) {
                error(e)
              }
            })
        } catch (e) {
          error(e)
        }
      })
  } catch (e) {
    if (watcher) watcher.close()

    error(e)
  }
}
