const path = require('path')
const {pathToFileURL} = require('url')

const RENDERER_SCHEME = 'idena-app'
const RENDERER_HOST = 'renderer'
const RENDERER_ORIGIN = `${RENDERER_SCHEME}://${RENDERER_HOST}`
const RENDERER_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self' http: https: ws: wss:",
  "font-src 'self' data:",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: blob: http: https:",
  "media-src 'self' data: blob: http: https:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join('; ')

function registerRendererScheme(protocol) {
  protocol.registerSchemesAsPrivileged([
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
}

function rendererRoot(appPath) {
  return path.resolve(appPath, 'renderer', 'out')
}

function isRendererUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return (
      url.protocol === `${RENDERER_SCHEME}:` &&
      url.hostname === RENDERER_HOST &&
      !url.username &&
      !url.password &&
      !url.port
    )
  } catch {
    return false
  }
}

function resolveRendererFile(urlValue, appPath, fileExists) {
  if (!isRendererUrl(urlValue)) return null

  try {
    const url = new URL(urlValue)
    let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    if (!relativePath) relativePath = 'home'
    if (relativePath.includes('\0') || relativePath.includes('\\')) return null

    if (!path.extname(relativePath)) {
      relativePath = `${relativePath}.html`
    }

    const root = rendererRoot(appPath)
    const filePath = path.resolve(root, relativePath)
    const relativeFilePath = path.relative(root, filePath)
    if (
      !relativeFilePath ||
      relativeFilePath.startsWith('..') ||
      path.isAbsolute(relativeFilePath)
    ) {
      return null
    }

    return !fileExists || fileExists(filePath) ? filePath : null
  } catch {
    return null
  }
}

function createRendererProtocolHandler({appPath, net, fileExists}) {
  return async (request) => {
    if (!request || !['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', {status: 405})
    }

    const filePath = resolveRendererFile(request.url, appPath, fileExists)
    if (!filePath) return new Response('Not found', {status: 404})

    let response
    try {
      response = await net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Not found', {status: 404})
    }
    if (path.extname(filePath).toLowerCase() !== '.html') return response

    const headers = new Headers(response.headers)
    headers.set('Content-Security-Policy', RENDERER_CONTENT_SECURITY_POLICY)
    return new Response(request.method === 'HEAD' ? null : response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  }
}

function installRendererProtocol({appPath, net, protocol, fileExists}) {
  protocol.handle(
    RENDERER_SCHEME,
    createRendererProtocolHandler({appPath, net, fileExists})
  )
}

module.exports = {
  RENDERER_CONTENT_SECURITY_POLICY,
  RENDERER_HOST,
  RENDERER_ORIGIN,
  RENDERER_SCHEME,
  createRendererProtocolHandler,
  installRendererProtocol,
  isRendererUrl,
  registerRendererScheme,
  rendererRoot,
  resolveRendererFile,
}
