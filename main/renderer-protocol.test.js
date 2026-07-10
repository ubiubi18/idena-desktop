const path = require('path')
const {pathToFileURL} = require('url')
const {
  RENDERER_CONTENT_SECURITY_POLICY,
  RENDERER_SCHEME,
  createRendererProtocolHandler,
  isRendererUrl,
  registerRendererScheme,
  rendererRoot,
  resolveRendererFile,
} = require('./renderer-protocol')

describe('packaged renderer protocol', () => {
  const appPath = path.resolve('test-app')
  const root = rendererRoot(appPath)
  const existingFiles = new Set([
    path.join(root, 'home.html'),
    path.join(root, 'settings', 'general.html'),
    path.join(root, 'static', 'logo.svg'),
    path.join(root, '_next', 'static', 'chunks', 'main.js'),
  ])
  const fileExists = (filePath) => existingFiles.has(filePath)

  it('registers a standard secure scheme without privileged CSP access', () => {
    const protocol = {registerSchemesAsPrivileged: jest.fn()}

    registerRendererScheme(protocol)

    expect(protocol.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: RENDERER_SCHEME,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          corsEnabled: true,
          stream: true,
          codeCache: true,
        },
      },
    ])
  })

  it('maps routes and assets inside renderer/out', () => {
    expect(
      resolveRendererFile('idena-app://renderer/home', appPath, fileExists)
    ).toBe(path.join(root, 'home.html'))
    expect(
      resolveRendererFile(
        'idena-app://renderer/settings/general?source=menu',
        appPath,
        fileExists
      )
    ).toBe(path.join(root, 'settings', 'general.html'))
    expect(
      resolveRendererFile(
        'idena-app://renderer/static/logo.svg',
        appPath,
        fileExists
      )
    ).toBe(path.join(root, 'static', 'logo.svg'))
    expect(
      resolveRendererFile(
        'idena-app://renderer/_next/static/chunks/main.js',
        appPath,
        fileExists
      )
    ).toBe(path.join(root, '_next', 'static', 'chunks', 'main.js'))
  })

  it('rejects untrusted origins, credentials, traversal, and missing files', () => {
    expect(isRendererUrl('idena-app://renderer/home')).toBe(true)
    expect(isRendererUrl('idena-app://evil/home')).toBe(false)
    expect(isRendererUrl('idena-app://user@renderer/home')).toBe(false)
    expect(isRendererUrl('idena-app://renderer:123/home')).toBe(false)
    expect(
      resolveRendererFile(
        'idena-app://renderer/..%2F..%2Fsecrets',
        appPath,
        () => true
      )
    ).toBeNull()
    expect(
      resolveRendererFile(
        'idena-app://renderer/static%5C..%5Csecrets',
        appPath,
        () => true
      )
    ).toBeNull()
    expect(
      resolveRendererFile(
        'idena-app://renderer/static/missing.svg',
        appPath,
        fileExists
      )
    ).toBeNull()
  })

  it('serves only existing files through Electron net.fetch', async () => {
    const net = {fetch: jest.fn(() => Promise.resolve(new Response('asset')))}
    const handler = createRendererProtocolHandler({appPath, net, fileExists})

    await expect(
      handler({method: 'GET', url: 'idena-app://renderer/static/logo.svg'})
    ).resolves.toBeInstanceOf(Response)
    expect(net.fetch).toHaveBeenCalledWith(
      pathToFileURL(path.join(root, 'static', 'logo.svg')).toString()
    )

    const pageResponse = await handler({
      method: 'GET',
      url: 'idena-app://renderer/home',
    })
    expect(pageResponse.headers.get('Content-Security-Policy')).toBe(
      RENDERER_CONTENT_SECURITY_POLICY
    )
    expect(RENDERER_CONTENT_SECURITY_POLICY).toContain("script-src 'self'")
    expect(RENDERER_CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval')

    const missing = await handler({
      method: 'GET',
      url: 'idena-app://renderer/static/missing.svg',
    })
    const forbidden = await handler({
      method: 'POST',
      url: 'idena-app://renderer/home',
    })
    expect(missing.status).toBe(404)
    expect(forbidden.status).toBe(405)
  })

  it('returns a generic 404 when Electron cannot load a confined file', async () => {
    const net = {fetch: jest.fn(() => Promise.reject(new Error('missing')))}
    const handler = createRendererProtocolHandler({appPath, net})

    const response = await handler({
      method: 'GET',
      url: 'idena-app://renderer/static/missing.svg',
    })

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not found')
  })
})
