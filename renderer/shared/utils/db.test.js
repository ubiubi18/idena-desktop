import {Buffer} from 'buffer'

function loadDatabaseModule(overrides = {}) {
  jest.resetModules()
  global.database = {
    get: jest.fn().mockResolvedValue({ok: true, value: 'value'}),
    put: jest.fn().mockResolvedValue({ok: true, value: null}),
    delete: jest.fn().mockResolvedValue({ok: true, value: null}),
    clear: jest.fn().mockResolvedValue({ok: true, value: null}),
    batch: jest.fn().mockResolvedValue({ok: true, value: null}),
    close: jest.fn().mockResolvedValue({ok: true, value: null}),
    isOpen: jest.fn(() => true),
    ...overrides,
  }

  // eslint-disable-next-line global-require
  return require('./db')
}

describe('renderer database bridge facade', () => {
  afterEach(() => {
    delete global.database
    jest.resetModules()
  })

  it('passes stable sublevel descriptors to the preload bridge', async () => {
    const {requestDb, subDb} = loadDatabaseModule()
    const db = subDb(requestDb(), 'votings', {valueEncoding: 'json'})

    await db.put('filter', {showAll: true})

    expect(global.database.put).toHaveBeenCalledWith(
      {
        name: 'db',
        prefixes: [{name: 'votings', options: {valueEncoding: 'json'}}],
      },
      'filter',
      {showAll: true}
    )
  })

  it('reconstructs buffers and not-found errors', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        value: {
          type: 'buffer',
          base64: Buffer.from('approve').toString('base64'),
        },
      })
      .mockResolvedValueOnce({
        ok: false,
        error: {message: 'missing', code: 'LEVEL_NOT_FOUND', notFound: true},
      })
    const {requestDb} = loadDatabaseModule({get})

    await expect(requestDb().get('status')).resolves.toEqual(
      Buffer.from('approve')
    )
    await expect(requestDb().get('missing')).rejects.toMatchObject({
      message: 'missing',
      code: 'LEVEL_NOT_FOUND',
      notFound: true,
    })
  })

  it('collects chained batch operations before crossing the bridge', async () => {
    const {requestDb} = loadDatabaseModule()

    await requestDb().batch().put('a', 1).del('b').write()

    expect(global.database.batch).toHaveBeenCalledWith(
      {name: 'db', prefixes: []},
      [
        {type: 'put', key: 'a', value: 1},
        {type: 'del', key: 'b'},
      ]
    )
  })
})
