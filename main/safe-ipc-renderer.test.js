const {
  AUTO_UPDATE_COMMAND,
  AUTO_UPDATE_EVENT,
  NODE_COMMAND,
  NODE_EVENT,
} = require('./channels')
const {createSafeIpcRenderer} = require('./safe-ipc-renderer')

function createIpcRendererMock() {
  return {
    invoke: jest.fn().mockResolvedValue('ok'),
    on: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn(),
  }
}

describe('safe ipcRenderer bridge', () => {
  it('allows expected renderer send channels and commands', () => {
    const ipcRenderer = createIpcRendererMock()
    const safeIpcRenderer = createSafeIpcRenderer(ipcRenderer)

    safeIpcRenderer.send(NODE_COMMAND, 'init-local-node')
    safeIpcRenderer.send(AUTO_UPDATE_COMMAND, 'update-node')
    safeIpcRenderer.send('set-data', 'idena-bot', true)
    safeIpcRenderer.send('showMainWindow')

    expect(ipcRenderer.send).toHaveBeenCalledTimes(4)
  })

  it('blocks unexpected send channels and commands', () => {
    const safeIpcRenderer = createSafeIpcRenderer(createIpcRendererMock())

    expect(() => safeIpcRenderer.send('shell', 'open')).toThrow(
      /Blocked IPC send channel/
    )
    expect(() =>
      safeIpcRenderer.send(NODE_COMMAND, 'delete-everything')
    ).toThrow(/Blocked node IPC command/)
    expect(() => safeIpcRenderer.send('set-data', 'unexpected', true)).toThrow(
      /Blocked set-data IPC key/
    )
  })

  it('allows expected invoke channels', async () => {
    const ipcRenderer = createIpcRendererMock()
    const safeIpcRenderer = createSafeIpcRenderer(ipcRenderer)

    await expect(safeIpcRenderer.invoke('search-image', 'cat')).resolves.toBe(
      'ok'
    )

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('search-image', 'cat')
  })

  it('blocks unexpected invoke channels', () => {
    const safeIpcRenderer = createSafeIpcRenderer(createIpcRendererMock())

    expect(() => safeIpcRenderer.invoke('open-file')).toThrow(
      /Blocked IPC invoke channel/
    )
  })

  it('wraps event listeners without exposing the raw Electron event', () => {
    const ipcRenderer = createIpcRendererMock()
    const safeIpcRenderer = createSafeIpcRenderer(ipcRenderer)
    const listener = jest.fn()

    safeIpcRenderer.on(NODE_EVENT, listener)
    const wrappedListener = ipcRenderer.on.mock.calls[0][1]
    wrappedListener({sender: 'raw'}, 'node-ready', {version: '1.0.0'})

    expect(listener).toHaveBeenCalledWith(undefined, 'node-ready', {
      version: '1.0.0',
    })
  })

  it('removes the wrapped listener for allowed listen channels', () => {
    const ipcRenderer = createIpcRendererMock()
    const safeIpcRenderer = createSafeIpcRenderer(ipcRenderer)
    const listener = jest.fn()

    safeIpcRenderer.on(AUTO_UPDATE_EVENT, listener)
    safeIpcRenderer.removeListener(AUTO_UPDATE_EVENT, listener)

    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      AUTO_UPDATE_EVENT,
      ipcRenderer.on.mock.calls[0][1]
    )
  })
})
