const fs = require('fs')
const os = require('os')
const path = require('path')
const leveldown = require('leveldown')
const levelup = require('levelup')
const sub = require('subleveldown')
const {createDatabaseBridge} = require('./database-bridge')

describe('database bridge with LevelDB', () => {
  let bridge
  let tempDirectory

  beforeEach(() => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'idena-leveldb-'))
    bridge = createDatabaseBridge({
      leveldown,
      levelup,
      sub,
      dbPath: (name) => path.join(tempDirectory, name),
      allowedDatabaseNames: ['integration'],
    })
  })

  afterEach(async () => {
    await bridge.close({name: 'integration'})
    fs.rmSync(tempDirectory, {force: true, recursive: true})
  })

  it('persists JSON sublevel values across close and reopen', async () => {
    const descriptor = {
      name: 'integration',
      prefixes: [{name: 'records', options: {valueEncoding: 'json'}}],
    }

    await expect(
      bridge.put(descriptor, 'first', {enabled: true})
    ).resolves.toEqual({ok: true, value: null})
    await expect(bridge.close(descriptor)).resolves.toEqual({
      ok: true,
      value: null,
    })

    await expect(bridge.get(descriptor, 'first')).resolves.toEqual({
      ok: true,
      value: {enabled: true},
    })
  })

  it('executes a persisted batch', async () => {
    const descriptor = {name: 'integration'}

    await expect(
      bridge.batch(descriptor, [
        {type: 'put', key: 'first', value: 'one'},
        {type: 'put', key: 'second', value: 'two'},
        {type: 'del', key: 'first'},
      ])
    ).resolves.toEqual({ok: true, value: null})
    await expect(bridge.get(descriptor, 'second')).resolves.toEqual({
      ok: true,
      value: {type: 'buffer', base64: Buffer.from('two').toString('base64')},
    })
    await expect(bridge.get(descriptor, 'first')).resolves.toMatchObject({
      ok: false,
      error: {notFound: true},
    })
  })
})
