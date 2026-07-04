const {
  isSafeExternalUrl,
  normalizeExternalUrl,
  openExternalUrl,
  unsafeExternalUrlLogContext,
} = require('./safe-external-url')

describe('safe external URL handling', () => {
  it('allows only supported external protocols', () => {
    expect(isSafeExternalUrl('https://idena.io/')).toBe(true)
    expect(isSafeExternalUrl('http://localhost:3000/callback')).toBe(true)
    expect(isSafeExternalUrl('dna://signin/v1?token=123')).toBe(true)

    expect(isSafeExternalUrl('https://user:pass@idena.io/')).toBe(false)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl(`java${'script'}:alert(1)`)).toBe(false)
    expect(isSafeExternalUrl('')).toBe(false)
    expect(isSafeExternalUrl(null)).toBe(false)
  })

  it('normalizes whitespace before opening allowed URLs', async () => {
    const electronShell = {
      openExternal: jest.fn().mockResolvedValue(undefined),
    }

    await expect(
      openExternalUrl(electronShell, '  https://idena.io/path  ')
    ).resolves.toBeUndefined()

    expect(electronShell.openExternal).toHaveBeenCalledWith(
      'https://idena.io/path'
    )
  })

  it('does not call Electron for unsafe URLs', async () => {
    const electronShell = {
      openExternal: jest.fn(),
    }
    const logger = {
      warn: jest.fn(),
    }

    await expect(
      openExternalUrl(electronShell, 'file:///tmp/private', logger)
    ).resolves.toBe(false)

    expect(electronShell.openExternal).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('Blocked unsafe external URL', {
      protocol: 'file:',
    })
  })

  it('does not log blocked URL paths or query strings', async () => {
    const electronShell = {
      openExternal: jest.fn(),
    }
    const logger = {
      warn: jest.fn(),
    }

    await openExternalUrl(
      electronShell,
      'file:///Users/alice/private?token=secret',
      logger
    )

    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('alice')
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('secret')
  })

  it('returns null for non-string or blocked values', () => {
    expect(normalizeExternalUrl(undefined)).toBeNull()
    expect(normalizeExternalUrl('ftp://idena.io/file')).toBeNull()
  })

  it('summarizes invalid URL values without raw content', () => {
    expect(unsafeExternalUrlLogContext(`bad url with secret`)).toEqual({
      type: 'invalid',
      length: 19,
    })
    expect(unsafeExternalUrlLogContext(null)).toEqual({type: 'object'})
  })
})
