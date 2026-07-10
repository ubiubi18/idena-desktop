const SECRET_API_VALUE = ['secret-api', 'value-that-should-not-be-logged'].join(
  '-'
)
const SECRET_STATE_VALUE = [
  'encrypted-state',
  'value-that-should-not-be-logged',
].join('-')

function loadPersistModuleWithFailingDb() {
  jest.resetModules()

  global.logger = {
    error: jest.fn(),
  }
  global.persistentState = {
    getState: jest.fn(),
    set: jest.fn(() => {
      throw new Error('write failed')
    }),
    setState: jest.fn(() => {
      throw new Error('write failed')
    }),
  }

  // eslint-disable-next-line global-require
  return require('./persist')
}

describe('persistent storage logging', () => {
  afterEach(() => {
    delete global.logger
    delete global.persistentState
    jest.resetModules()
  })

  it('does not log item values when a write fails', () => {
    const {persistItem} = loadPersistModuleWithFailingDb()

    persistItem('settings', 'apiKey', SECRET_API_VALUE)

    const logged = JSON.stringify(global.logger.error.mock.calls)

    expect(logged).toContain('settings')
    expect(logged).toContain('apiKey')
    expect(logged).not.toContain(SECRET_API_VALUE)
  })

  it('does not log full state when a state write fails', () => {
    const {persistState} = loadPersistModuleWithFailingDb()

    persistState('settings', {
      apiKey: SECRET_API_VALUE,
      encryptedKey: SECRET_STATE_VALUE,
    })

    const logged = JSON.stringify(global.logger.error.mock.calls)

    expect(logged).toContain('settings')
    expect(logged).not.toContain(SECRET_API_VALUE)
    expect(logged).not.toContain(SECRET_STATE_VALUE)
  })
})
