import {loadPersistentState} from '../utils/persist'
import {BASE_API_URL, BASE_INTERNAL_API_PORT, getRpcParams} from './api-client'

jest.mock('../utils/persist', () => ({
  loadPersistentState: jest.fn(),
}))

describe('RPC parameters', () => {
  beforeEach(() => {
    loadPersistentState.mockReset()
  })

  it('uses the local default without dereferencing missing settings', () => {
    loadPersistentState.mockReturnValue(null)

    expect(getRpcParams()).toEqual({
      url: `http://localhost:${BASE_INTERNAL_API_PORT}`,
      key: undefined,
    })
  })

  it('uses persisted local node settings', () => {
    loadPersistentState.mockReturnValue({
      useExternalNode: false,
      internalPort: 9123,
      internalApiKey: 'local-key',
    })

    expect(getRpcParams()).toEqual({
      url: 'http://localhost:9123',
      key: 'local-key',
    })
  })

  it('uses persisted external node settings with the default URL fallback', () => {
    loadPersistentState.mockReturnValue({
      useExternalNode: true,
      url: '',
      externalApiKey: 'external-key',
    })

    expect(getRpcParams()).toEqual({
      url: BASE_API_URL,
      key: 'external-key',
    })
  })
})
