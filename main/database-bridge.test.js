const {createDatabaseBridge, normalizeDescriptor} = require('./database-bridge')

function createFakeDatabase() {
  const batch = {
    put: jest.fn(() => batch),
    del: jest.fn(() => batch),
    write: jest.fn().mockResolvedValue(undefined),
  }
  return {
    get: jest.fn().mockResolvedValue({value: 1}),
    put: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    batch: jest.fn(() => batch),
    close: jest.fn().mockResolvedValue(undefined),
    isOpen: jest.fn(() => true),
    batchHandle: batch,
  }
}

describe('database context bridge', () => {
  it('preserves sublevel prefixes and approved value encodings', async () => {
    const root = createFakeDatabase()
    const child = createFakeDatabase()
    const sub = jest.fn(() => child)
    const bridge = createDatabaseBridge({
      leveldown: jest.fn((value) => value),
      levelup: jest.fn(() => root),
      sub,
      dbPath: jest.fn((name) => `/data/${name}`),
    })
    const descriptor = {
      name: 'db',
      prefixes: [{name: 'votings', options: {valueEncoding: 'json'}}],
    }

    await expect(
      bridge.put(descriptor, 'filter', {showAll: true})
    ).resolves.toEqual({ok: true, value: null})
    expect(sub).toHaveBeenCalledWith(root, 'votings', {
      valueEncoding: 'json',
    })
    expect(child.put).toHaveBeenCalledWith('filter', {showAll: true})
  })

  it('returns structured errors with not-found metadata', async () => {
    const root = createFakeDatabase()
    root.get.mockRejectedValue(
      Object.assign(new Error('missing'), {
        code: 'LEVEL_NOT_FOUND',
        notFound: true,
      })
    )
    const bridge = createDatabaseBridge({
      leveldown: jest.fn(),
      levelup: jest.fn(() => root),
      sub: jest.fn(),
      dbPath: jest.fn(),
    })

    await expect(
      bridge.get({name: 'db', prefixes: []}, 'missing')
    ).resolves.toEqual({
      ok: false,
      error: {
        message: 'missing',
        code: 'LEVEL_NOT_FOUND',
        notFound: true,
      },
    })
  })

  it('rejects traversal names and unsupported options', () => {
    expect(() => normalizeDescriptor({name: '../secrets'})).toThrow(
      'Invalid database name'
    )
    expect(() => normalizeDescriptor({name: '..'})).toThrow(
      'Invalid database name'
    )
    expect(() =>
      normalizeDescriptor({
        name: 'db',
        prefixes: [{name: 'safe', options: {keyEncoding: 'json'}}],
      })
    ).toThrow('Unsupported database option')

    const bridge = createDatabaseBridge({
      leveldown: jest.fn(),
      levelup: jest.fn(),
      sub: jest.fn(),
      dbPath: jest.fn(),
    })
    expect(() => bridge.isOpen({name: 'other'})).toThrow(
      'Unsupported database name'
    )
  })

  it('executes bounded batches in order', async () => {
    const root = createFakeDatabase()
    const bridge = createDatabaseBridge({
      leveldown: jest.fn(),
      levelup: jest.fn(() => root),
      sub: jest.fn(),
      dbPath: jest.fn(),
    })

    await expect(
      bridge.batch({name: 'db'}, [
        {type: 'put', key: 'a', value: 1},
        {type: 'del', key: 'b'},
      ])
    ).resolves.toEqual({ok: true, value: null})
    expect(root.batchHandle.put).toHaveBeenCalledWith('a', 1)
    expect(root.batchHandle.del).toHaveBeenCalledWith('b')
    expect(root.batchHandle.write).toHaveBeenCalledTimes(1)
  })
})
