const {isTrustedIpcSender} = require('./ipc-sender')

function createFixture(url = 'idena-app://renderer/home') {
  const mainFrame = {url}
  const webContents = {mainFrame, isDestroyed: jest.fn(() => false)}
  return {
    event: {sender: webContents, senderFrame: mainFrame},
    mainWindow: {webContents},
  }
}

describe('IPC sender validation', () => {
  it('accepts only the main frame at an allowed renderer URL', () => {
    const {event, mainWindow} = createFixture()

    expect(
      isTrustedIpcSender(
        event,
        mainWindow,
        (url) => url === 'idena-app://renderer/home'
      )
    ).toBe(true)
  })

  it('rejects other web contents, subframes, and untrusted URLs', () => {
    const {event, mainWindow} = createFixture()
    const isAllowedUrl = jest.fn(() => true)

    expect(
      isTrustedIpcSender({...event, sender: {}}, mainWindow, isAllowedUrl)
    ).toBe(false)
    expect(
      isTrustedIpcSender(
        {...event, senderFrame: {url: event.senderFrame.url}},
        mainWindow,
        isAllowedUrl
      )
    ).toBe(false)
    expect(isTrustedIpcSender(event, mainWindow, () => false)).toBe(false)
  })

  it('rejects destroyed or unavailable windows', () => {
    const {event, mainWindow} = createFixture()
    mainWindow.webContents.isDestroyed.mockReturnValue(true)

    expect(isTrustedIpcSender(event, mainWindow, () => true)).toBe(false)
    expect(isTrustedIpcSender(event, null, () => true)).toBe(false)
  })
})
