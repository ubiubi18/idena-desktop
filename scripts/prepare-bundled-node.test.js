jest.mock('fs')
jest.mock('child_process', () => ({spawnSync: jest.fn()}))

const fs = require('fs')
const {spawnSync} = require('child_process')
const {main} = require('./prepare-bundled-node')

describe('prepare bundled node', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fs.existsSync.mockReturnValue(true)
    fs.statSync.mockReturnValue({size: 2 * 1024 * 1024})
    spawnSync.mockReturnValue({status: 0, stdout: 'idena-go version 1.1.2'})
  })

  it('rebuilds an existing same-version binary from checked source pins', () => {
    main()

    const {calls} = spawnSync.mock
    expect(calls[0][1][0]).toMatch(/scripts[/\\]setup-sources\.js$/u)
    expect(calls[0][1][1]).toBe('--check')
    expect(calls[1][1][0]).toMatch(/scripts[/\\]build-node-from-sources\.js$/u)
    expect(calls[2][1]).toEqual(['--version'])
    expect(fs.copyFileSync).not.toHaveBeenCalled()
  })

  it('stops before building when the source pin check fails', () => {
    spawnSync.mockReturnValueOnce({status: 1})

    expect(() => main()).toThrow('exited with 1')
    expect(spawnSync).toHaveBeenCalledTimes(1)
  })
})
