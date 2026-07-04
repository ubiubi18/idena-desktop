const {
  MIN_NODE_BINARY_SIZE,
  assertSafeNodeDownloadUrl,
  isSafeNodeDownloadUrl,
  validateDownloadedNode,
} = require('./node-download-safety')

describe('node download safety', () => {
  it('allows only Idena node release asset URLs from GitHub', () => {
    expect(
      isSafeNodeDownloadUrl(
        'https://github.com/idena-network/idena-go/releases/download/v1.1.2/idena-node-mac-1.1.2'
      )
    ).toBe(true)

    expect(
      isSafeNodeDownloadUrl(
        'https://github.com/other/idena-go/releases/download/v1.1.2/idena-node-mac'
      )
    ).toBe(false)
    expect(
      isSafeNodeDownloadUrl(
        'http://github.com/idena-network/idena-go/releases/download/v1.1.2/idena-node-mac'
      )
    ).toBe(false)
    expect(
      isSafeNodeDownloadUrl(
        'https://user:token@github.com/idena-network/idena-go/releases/download/v1.1.2/idena-node-mac'
      )
    ).toBe(false)
  })

  it('returns a normalized safe node download URL', () => {
    expect(
      assertSafeNodeDownloadUrl(
        'https://github.com/idena-network/idena-go/releases/download/v1.1.2/idena-node-linux'
      )
    ).toBe(
      'https://github.com/idena-network/idena-go/releases/download/v1.1.2/idena-node-linux'
    )
  })

  it('validates size and version before installing a downloaded node binary', async () => {
    const getBinaryVersion = jest.fn().mockResolvedValue('1.1.2')
    const stat = jest.fn().mockResolvedValue({size: MIN_NODE_BINARY_SIZE})
    const chmod = jest.fn().mockResolvedValue(undefined)

    await expect(
      validateDownloadedNode({
        filePath: '/tmp/idena-go',
        expectedVersion: 'v1.1.2',
        getBinaryVersion,
        stat,
        chmod,
        platform: 'darwin',
      })
    ).resolves.toBe('1.1.2')

    expect(chmod).toHaveBeenCalledWith('/tmp/idena-go', 0o755)
    expect(getBinaryVersion).toHaveBeenCalledWith('/tmp/idena-go')
  })

  it('rejects unexpectedly small node binaries', async () => {
    await expect(
      validateDownloadedNode({
        filePath: '/tmp/idena-go',
        expectedVersion: '1.1.2',
        getBinaryVersion: jest.fn(),
        stat: jest.fn().mockResolvedValue({size: MIN_NODE_BINARY_SIZE - 1}),
        chmod: jest.fn().mockResolvedValue(undefined),
      })
    ).rejects.toThrow('unexpectedly small')
  })

  it('rejects node binaries that report the wrong version', async () => {
    await expect(
      validateDownloadedNode({
        filePath: '/tmp/idena-go',
        expectedVersion: '1.1.2',
        getBinaryVersion: jest.fn().mockResolvedValue('1.1.1'),
        stat: jest.fn().mockResolvedValue({size: MIN_NODE_BINARY_SIZE}),
        chmod: jest.fn().mockResolvedValue(undefined),
      })
    ).rejects.toThrow('version mismatch')
  })
})
