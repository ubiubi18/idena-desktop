const {
  MAX_LOG_MESSAGE_LENGTH,
  createRendererLogger,
  formatRendererLogArguments,
  isSensitiveKey,
} = require('./safe-renderer-logger')

describe('safe renderer logger', () => {
  it('redacts secret and flip image fields recursively', () => {
    const message = formatRendererLogArguments([
      'failed',
      {
        apiKey: 'secret-api-key',
        nested: {privateHex: 'secret-flip', images: ['secret-image']},
      },
    ])

    expect(message).toContain('failed')
    expect(message).toContain('[redacted]')
    expect(message).not.toContain('secret-api-key')
    expect(message).not.toContain('secret-flip')
    expect(message).not.toContain('secret-image')
  })

  it('classifies authentication material and URLs as sensitive', () => {
    expect(isSensitiveKey('internalApiKey')).toBe(true)
    expect(isSensitiveKey('encoded_private_key')).toBe(true)
    expect(isSensitiveKey('mnemonic')).toBe(true)
    expect(isSensitiveKey('refreshCookie')).toBe(true)
    expect(isSensitiveKey('url')).toBe(true)
  })

  it('bounds cyclic and oversized log payloads', () => {
    const value = {text: 'x'.repeat(MAX_LOG_MESSAGE_LENGTH * 2)}
    value.self = value

    const message = formatRendererLogArguments([value])

    expect(message.length).toBeLessThanOrEqual(MAX_LOG_MESSAGE_LENGTH)
    expect(message).toContain('[truncated]')
    expect(message).toContain('[circular]')
  })

  it('sends only a fixed level and sanitized string to main', () => {
    const ipcRenderer = {send: jest.fn()}
    const logger = createRendererLogger(ipcRenderer, 'logger/command')

    logger.error('failed', {token: 'secret'})

    expect(Object.keys(logger)).toEqual(['debug', 'info', 'warn', 'error'])
    expect(ipcRenderer.send).toHaveBeenCalledWith(
      'logger/command',
      'error',
      expect.stringContaining('[redacted]')
    )
    expect(ipcRenderer.send.mock.calls[0][2]).not.toContain('secret')
  })
})
