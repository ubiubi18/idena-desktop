const semver = require('semver')

const MIN_NODE_BINARY_SIZE = 1024 * 1024
const NODE_RELEASE_PATH_PREFIX = '/idena-network/idena-go/releases/download/'

function isSafeNodeDownloadUrl(value) {
  if (typeof value !== 'string') {
    return false
  }

  try {
    const parsedUrl = new URL(value)

    return (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.username === '' &&
      parsedUrl.password === '' &&
      parsedUrl.hostname === 'github.com' &&
      parsedUrl.pathname.startsWith(NODE_RELEASE_PATH_PREFIX)
    )
  } catch {
    return false
  }
}

function assertSafeNodeDownloadUrl(value) {
  if (!isSafeNodeDownloadUrl(value)) {
    throw new Error('Unsafe Idena node download URL')
  }

  return new URL(value).href
}

async function validateDownloadedNode({
  filePath,
  expectedVersion,
  getBinaryVersion,
  stat,
  chmod,
  platform = process.platform,
}) {
  const normalizedExpectedVersion = semver.clean(expectedVersion)
  if (!normalizedExpectedVersion) {
    throw new Error(`Invalid expected Idena node version: ${expectedVersion}`)
  }

  if (platform !== 'win32') {
    await chmod(filePath, 0o755)
  }

  const stats = await stat(filePath)
  if (!stats || stats.size < MIN_NODE_BINARY_SIZE) {
    throw new Error('Downloaded Idena node binary is unexpectedly small')
  }

  const actualVersion = await getBinaryVersion(filePath)
  if (actualVersion !== normalizedExpectedVersion) {
    throw new Error(
      `Downloaded Idena node version mismatch: expected ${normalizedExpectedVersion}, got ${actualVersion}`
    )
  }

  return actualVersion
}

module.exports = {
  MIN_NODE_BINARY_SIZE,
  assertSafeNodeDownloadUrl,
  isSafeNodeDownloadUrl,
  validateDownloadedNode,
}
