import debug from 'debug'

import {
  getPackageVersion,
  gitTag
} from '#build/gulp/common'

const log = debug('@sequencemedia/minimserver:build:gulp:post-commit')
const error = debug('@sequencemedia/minimserver:build:gulp:post-commit:error')

log('`@sequencemedia/minimserver` is awake')

export default async function postCommit () {
  log('post-commit')

  try {
    await gitTag(await getPackageVersion())
  } catch ({ code = 'NONE', message = 'No error message defined' }) {
    error({ code, message })
  }
}
