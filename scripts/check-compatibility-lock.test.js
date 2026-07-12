const lock = require('../compatibility/stack-lock.json')
const sources = require('./source-manifest.json')
const {verifyCompatibilityLock} = require('./check-compatibility-lock')

describe('desktop compatibility lock', () => {
  it('pins the reviewed node and binding source', () => {
    expect(() => verifyCompatibilityLock(lock, sources)).not.toThrow()
  })

  it('rejects source pin drift', () => {
    const changed = JSON.parse(JSON.stringify(sources))
    changed.sources[0].commit = '0'.repeat(40)
    expect(() => verifyCompatibilityLock(lock, changed)).toThrow(
      'idena-go does not match the desktop compatibility pin'
    )
  })

  it('rejects an unreviewed extra source', () => {
    const changed = JSON.parse(JSON.stringify(sources))
    changed.sources.push({
      name: 'unreviewed',
      url: 'https://github.com/example/unreviewed.git',
      commit: '1'.repeat(40),
    })
    expect(() => verifyCompatibilityLock(lock, changed)).toThrow(
      'Desktop source manifest contains an unreviewed component'
    )
  })
})
