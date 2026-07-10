const path = require('path')

const mockAppPath = path.resolve('test-app')

jest.mock('electron', () => ({
  app: {
    getAppPath: () => mockAppPath,
    isPackaged: true,
  },
}))

const loadRoute = require('./routes')

describe('renderer routes', () => {
  it('loads packaged pages from the renderer origin', () => {
    const window = {loadFile: jest.fn(), loadURL: jest.fn()}

    loadRoute(window, 'settings/general')

    expect(window.loadURL).toHaveBeenCalledWith(
      'idena-app://renderer/settings/general'
    )
    expect(window.loadFile).not.toHaveBeenCalled()
  })

  it('recognizes packaged page URLs without treating assets as routes', () => {
    const fileExists = jest.fn(() => true)

    expect(
      loadRoute.resolvePackagedRouteNameFromUrl(
        'idena-app://renderer/settings/general',
        mockAppPath,
        fileExists
      )
    ).toBe('settings/general')
    expect(
      loadRoute.resolvePackagedRouteNameFromUrl(
        'idena-app://renderer/_next/static/chunks/main.js',
        mockAppPath,
        fileExists
      )
    ).toBeNull()
    expect(
      loadRoute.resolvePackagedRouteNameFromUrl(
        'https://example.com/settings/general',
        mockAppPath,
        fileExists
      )
    ).toBeNull()
  })
})
