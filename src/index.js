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
import del from 'del'

import debug from 'debug'

const error = debug('minimserver:error')
const log = debug('minimserver:log')

async function originDirExists (path) {
  try {
    await stat(path)
    return true
  } catch (e) {
    const {
      code
    } = e

    if (code !== 'ENOENT') {
      const {
        message
      } = e

      error(message)
    }
    return false
  }
}

const removeAllM3UFromDestinationDir = async (path) => del(path, { force: true })

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

export function rescan (server) {
  /*
   *  log('rescan')
   */
  return (
    new Promise((resolve, reject) => {
      exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d rescan`, (e, r) => (!e) ? resolve(r) : reject(e))
    })
  )
}

export function restart (server) {
  /*
   *  log('restart')
   */
  return (
    new Promise((resolve, reject) => {
      exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d restart`, (e, r) => (!e) ? resolve(r) : reject(e))
    })
  )
}

export function relaunch (server) {
  /*
   *  log('relaunch')
   */
  return (
    new Promise((resolve, reject) => {
      exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d relaunch`, (e, r) => (!e) ? resolve(r) : reject(e))
    })
  )
}

export function exit (server) {
  /*
   *  log('exit')
   */
  return (
    new Promise((resolve, reject) => {
      exec(`curl -X POST -H "Content-Type: text/plain" ${server} -d exit`, (e, r) => (!e) ? resolve(r) : reject(e))
    })
  )
}

function createFactory (origin, destination) {
  /*
   *  log('createFactory')
   */
  return async function create (filePath) {
    const to = filePath.replace(origin, destination)

    log('create', to)

    try {
      await ensureDestinationM3U(to)
      return copyFile(filePath, to)
    } catch (e) {
      const {
        code
      } = e

      if (code === 'ENOENT') {
        error(`ENOENT in create for "${filePath}"`)
      } else {
        const {
          message
        } = e

        error(message)
      }
    }
  }
}

function changeFactory (origin, destination) {
  /*
   *  log('changeFactory')
   */
  return async function change (filePath) {
    const to = filePath.replace(origin, destination)

    log('change', to)

    try {
      await ensureDestinationM3U(to)
      return copyFile(filePath, to)
    } catch (e) {
      const {
        code
      } = e

      if (code === 'ENOENT') {
        error(`ENOENT in change for "${filePath}"`)
      } else {
        const {
          message
        } = e

        error(message)
      }
    }
  }
}

function removeFactory (origin, destination) {
  /*
   *  log('removeFactory')
   */
  return async function remove (filePath) {
    const to = filePath.replace(origin, destination)

    log('remove', to)

    try {
      return del(to, { force: true })
    } catch ({ message }) {
      error(message)
    }
  }
}

function queueRescanFactory (server) {
  /*
   *  log('queueRescanFactory')
   */
  let t = null
  let x = null
  let y = null

  return function enqueue () {
    /*
     *  log('enqueue')
     */
    if (t) {
      clearTimeout(t)

      if (x) {
        y = true
        return
      }
    }

    t = setTimeout(async function dequeue () {
      /*
       *  log('dequeue')
       */
      x = true

      try {
        const response = await rescan(server)

        log(response.trim())

        t = null
        x = null

        if (y) {
          y = null
          enqueue()
        }
      } catch ({ message }) {
        error(message)
      }
    }, 9999)
  }
}

function ignorePatternFactory (ignore) {
  const ignorePatterns = ignore.split(',')

  return function ignorePattern (filePath) {
    return /(^|[/\\])\../.test(filePath) || anymatch(ignorePatterns, filePath)
  }
}

export async function execute (
  origin = '.',
  destination = '.',
  server = 'http://0.0.0.0:9790',
  ignore = ''
) {
  /*
   * log('execute')
   */
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
      .on('add', async function handleAdd (filePath) {
        try {
          await create(filePath)

          queueRescan()
        } catch ({ message }) {
          error(message)
        }
      })
      .on('change', async function handleChange (filePath) {
        try {
          await change(filePath)

          queueRescan()
        } catch ({ message }) {
          error(message)
        }
      })
      .on('unlink', async function handleUnlink (filePath) {
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
