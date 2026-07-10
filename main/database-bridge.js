const SAFE_DATABASE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u
const MAX_PREFIX_DEPTH = 8
const MAX_BATCH_OPERATIONS = 10_000
const DEFAULT_DATABASE_NAMES = ['db']

function normalizeName(value, label) {
  if (typeof value !== 'string' || !SAFE_DATABASE_NAME.test(value)) {
    throw new Error(`Invalid ${label}`)
  }
  return value
}

function normalizeOptions(value) {
  if (value == null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid database options')
  }

  const keys = Object.keys(value)
  if (keys.some((key) => key !== 'valueEncoding')) {
    throw new Error('Unsupported database option')
  }
  if (
    value.valueEncoding !== undefined &&
    !['json', 'utf8'].includes(value.valueEncoding)
  ) {
    throw new Error('Unsupported database value encoding')
  }
  return value.valueEncoding ? {valueEncoding: value.valueEncoding} : {}
}

function normalizeDescriptor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid database descriptor')
  }

  const prefixes = value.prefixes || []
  if (!Array.isArray(prefixes) || prefixes.length > MAX_PREFIX_DEPTH) {
    throw new Error('Invalid database prefix chain')
  }

  return {
    name: normalizeName(value.name, 'database name'),
    prefixes: prefixes.map((prefix) => {
      if (!prefix || typeof prefix !== 'object' || Array.isArray(prefix)) {
        throw new Error('Invalid database prefix')
      }
      return {
        name: normalizeName(prefix.name, 'database prefix'),
        options: normalizeOptions(prefix.options),
      }
    }),
  }
}

function errorResult(error) {
  return {
    ok: false,
    error: {
      message: String(error?.message || error || 'Database operation failed'),
      code: typeof error?.code === 'string' ? error.code : null,
      notFound: Boolean(error?.notFound),
    },
  }
}

async function runOperation(operation) {
  try {
    const value = await operation()
    if (Buffer.isBuffer(value)) {
      return {
        ok: true,
        value: {type: 'buffer', base64: value.toString('base64')},
      }
    }
    return {ok: true, value: value === undefined ? null : value}
  } catch (error) {
    return errorResult(error)
  }
}

function createDatabaseBridge({
  levelup,
  leveldown,
  sub,
  dbPath,
  allowedDatabaseNames = DEFAULT_DATABASE_NAMES,
}) {
  const roots = new Map()
  const allowedNames = new Set(allowedDatabaseNames)

  function validatedDescriptor(value) {
    const descriptor = normalizeDescriptor(value)
    if (!allowedNames.has(descriptor.name)) {
      throw new Error('Unsupported database name')
    }
    return descriptor
  }

  function rootDatabase(name) {
    const normalizedName = normalizeName(name, 'database name')
    if (!roots.has(normalizedName)) {
      roots.set(normalizedName, levelup(leveldown(dbPath(normalizedName))))
    }
    return roots.get(normalizedName)
  }

  function database(value) {
    const descriptor = validatedDescriptor(value)
    return descriptor.prefixes.reduce(
      (current, prefix) => sub(current, prefix.name, prefix.options),
      rootDatabase(descriptor.name)
    )
  }

  return Object.freeze({
    get: (descriptor, key) => runOperation(() => database(descriptor).get(key)),
    put: (descriptor, key, value) =>
      runOperation(() => database(descriptor).put(key, value)),
    delete: (descriptor, key) =>
      runOperation(() => database(descriptor).del(key)),
    clear: (descriptor) => runOperation(() => database(descriptor).clear()),
    batch: (descriptor, operations) =>
      runOperation(() => {
        if (
          !Array.isArray(operations) ||
          operations.length > MAX_BATCH_OPERATIONS
        ) {
          throw new Error('Invalid database batch')
        }

        let batch = database(descriptor).batch()
        for (const operation of operations) {
          if (!operation || typeof operation !== 'object') {
            throw new Error('Invalid database batch operation')
          }
          if (operation.type === 'put') {
            batch = batch.put(operation.key, operation.value)
          } else if (operation.type === 'del') {
            batch = batch.del(operation.key)
          } else {
            throw new Error('Invalid database batch operation')
          }
        }
        return batch.write()
      }),
    isOpen(descriptor) {
      const {name} = validatedDescriptor(descriptor)
      return Boolean(roots.get(name)?.isOpen())
    },
    close(descriptor) {
      const {name} = validatedDescriptor(descriptor)
      const root = roots.get(name)
      if (!root) return Promise.resolve({ok: true, value: null})
      return runOperation(async () => {
        await root.close()
        roots.delete(name)
      })
    },
  })
}

module.exports = {
  createDatabaseBridge,
  normalizeDescriptor,
}
