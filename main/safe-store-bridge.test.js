const {createPersistentStateBridge} = require('./safe-store-bridge')

describe('persistent state context bridge', () => {
  it('allows scoped state operations', () => {
    const write = jest.fn(() => ({saved: true}))
    const db = {
      getState: jest.fn(() => ({locale: 'en'})),
      set: jest.fn(() => ({write})),
      setState: jest.fn(() => ({write})),
    }
    const prepareDb = jest.fn(() => db)
    const bridge = createPersistentStateBridge(prepareDb)

    expect(bridge.getState('settings')).toEqual({locale: 'en'})
    expect(bridge.set('settings', 'locale', 'de')).toEqual({saved: true})
    expect(bridge.setState('settings', {locale: 'fr'})).toEqual({saved: true})
    expect(prepareDb).toHaveBeenCalledWith('settings')
  })

  it('rejects traversal names and unsafe keys', () => {
    const bridge = createPersistentStateBridge(jest.fn())

    expect(() => bridge.getState('../settings')).toThrow(
      'Invalid persistent store name'
    )
    expect(() => bridge.set('settings', '../apiKey', 'value')).toThrow(
      'Invalid persistent store key'
    )
    expect(() => bridge.getState('other')).toThrow(
      'Unsupported persistent store name'
    )
  })
})
