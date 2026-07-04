const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'dna:'])

function normalizeExternalUrl(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsedUrl.protocol)) {
      return null
    }

    if (parsedUrl.username || parsedUrl.password) {
      return null
    }

    if (['http:', 'https:'].includes(parsedUrl.protocol) && !parsedUrl.host) {
      return null
    }

    return parsedUrl.href
  } catch {
    return null
  }
}

function isSafeExternalUrl(value) {
  return Boolean(normalizeExternalUrl(value))
}

function unsafeExternalUrlLogContext(value) {
  if (typeof value !== 'string') {
    return {type: typeof value}
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return {type: 'empty'}
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    return {
      protocol: parsedUrl.protocol || 'unknown:',
      ...(parsedUrl.host ? {host: parsedUrl.host} : {}),
    }
  } catch {
    return {
      type: 'invalid',
      length: trimmedValue.length,
    }
  }
}

function openExternalUrl(electronShell, value, logger) {
  const externalUrl = normalizeExternalUrl(value)
  if (!externalUrl) {
    logger?.warn?.(
      'Blocked unsafe external URL',
      unsafeExternalUrlLogContext(value)
    )
    return Promise.resolve(false)
  }

  return electronShell.openExternal(externalUrl)
}

module.exports = {
  ALLOWED_EXTERNAL_PROTOCOLS,
  isSafeExternalUrl,
  normalizeExternalUrl,
  openExternalUrl,
  unsafeExternalUrlLogContext,
}
