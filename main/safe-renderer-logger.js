const MAX_LOG_ARGUMENTS = 10
const MAX_LOG_DEPTH = 4
const MAX_LOG_ITEMS = 40
const MAX_LOG_MESSAGE_LENGTH = 16 * 1024
const MAX_LOG_STRING_LENGTH = 2048

function isSensitiveKey(value) {
  const key = String(value)
    .replace(/[^a-z0-9]/giu, '')
    .toLowerCase()

  return (
    key === 'key' ||
    key === 'url' ||
    key.endsWith('apikey') ||
    key.endsWith('authorization') ||
    key.endsWith('cookie') ||
    key.endsWith('credential') ||
    key.endsWith('mnemonic') ||
    key.endsWith('passphrase') ||
    key.endsWith('privatekey') ||
    key.endsWith('password') ||
    key.endsWith('secret') ||
    key.endsWith('seed') ||
    key.endsWith('session') ||
    key.endsWith('token') ||
    key.endsWith('signature') ||
    key.endsWith('hex') ||
    ['images', 'pics', 'urls'].includes(key)
  )
}

function truncate(value, limit = MAX_LOG_STRING_LENGTH) {
  const input = String(value)
  const marker = '[truncated]'
  return input.length <= limit
    ? input
    : `${input.slice(0, Math.max(0, limit - marker.length))}${marker}`
}

function sanitizeLogValue(value, depth = 0, seen = new WeakSet()) {
  if (
    value == null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value
  }
  if (typeof value === 'string') return truncate(value)
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'function') return '[function]'
  if (typeof value === 'symbol') return truncate(value.toString())
  if (depth >= MAX_LOG_DEPTH) return '[truncated]'
  if (Buffer.isBuffer(value)) return `<buffer:${value.length}>`
  if (ArrayBuffer.isView(value)) {
    return `<${value.constructor?.name || 'typed-array'}:${value.byteLength}>`
  }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return {
      name: truncate(value.name),
      message: truncate(value.message),
      stack: value.stack ? truncate(value.stack) : undefined,
    }
  }
  if (typeof value !== 'object') return truncate(value)
  if (seen.has(value)) return '[circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_LOG_ITEMS)
      .map((item) => sanitizeLogValue(item, depth + 1, seen))
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_LOG_ITEMS)
      .map(([key, item]) => [
        key,
        isSensitiveKey(key)
          ? '[redacted]'
          : sanitizeLogValue(item, depth + 1, seen),
      ])
  )
}

function formatRendererLogArguments(args) {
  const message = Array.from(args || [])
    .slice(0, MAX_LOG_ARGUMENTS)
    .map((value) => {
      const sanitized = sanitizeLogValue(value)
      return typeof sanitized === 'string'
        ? sanitized
        : JSON.stringify(sanitized)
    })
    .join(' ')

  return truncate(message, MAX_LOG_MESSAGE_LENGTH)
}

function createRendererLogger(ipcRenderer, channel) {
  return Object.freeze(
    Object.fromEntries(
      ['debug', 'info', 'warn', 'error'].map((level) => [
        level,
        (...args) =>
          ipcRenderer.send(channel, level, formatRendererLogArguments(args)),
      ])
    )
  )
}

module.exports = {
  MAX_LOG_MESSAGE_LENGTH,
  createRendererLogger,
  formatRendererLogArguments,
  isSensitiveKey,
  sanitizeLogValue,
}
