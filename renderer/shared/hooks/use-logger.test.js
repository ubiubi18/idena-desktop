import {redactLogAction, redactLogValue} from './use-logger'

const SECRET_API_VALUE = ['secret-api', 'value-that-should-not-be-logged'].join(
  '-'
)
const SECRET_TOKEN_VALUE = [
  'secret-token',
  'value-that-should-not-be-logged',
].join('-')
const SECRET_DATA_VALUE = [
  'secret-data',
  'value-that-should-not-be-logged',
].join('-')

describe('logger redaction', () => {
  it('redacts sensitive keys in nested state', () => {
    const redacted = redactLogValue({
      settings: {
        internalApiKey: SECRET_API_VALUE,
        nested: {
          token: SECRET_TOKEN_VALUE,
        },
      },
      safe: 'visible',
    })

    const logged = JSON.stringify(redacted)

    expect(redacted.safe).toBe('visible')
    expect(logged).not.toContain(SECRET_API_VALUE)
    expect(logged).not.toContain(SECRET_TOKEN_VALUE)
    expect(logged).toContain('[redacted]')
  })

  it('redacts sensitive keys inside arrays', () => {
    const redacted = redactLogValue([
      {
        apiKey: SECRET_API_VALUE,
      },
    ])

    expect(JSON.stringify(redacted)).not.toContain(SECRET_API_VALUE)
  })

  it('redacts generic payloads for sensitive action types', () => {
    const redacted = redactLogAction({
      type: 'SET_INTERNAL_KEY',
      data: SECRET_DATA_VALUE,
    })

    expect(JSON.stringify(redacted)).not.toContain(SECRET_DATA_VALUE)
    expect(redacted.data).toBe('[redacted]')
  })

  it('does not recurse forever on circular objects', () => {
    const value = {
      safe: true,
    }
    value.self = value

    expect(redactLogValue(value)).toEqual({
      safe: true,
      self: '[circular]',
    })
  })
})
