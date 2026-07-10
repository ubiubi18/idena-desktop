function isTrustedIpcSender(event, mainWindow, isAllowedUrl) {
  const webContents = mainWindow?.webContents
  const senderFrame = event?.senderFrame

  if (
    !webContents ||
    webContents.isDestroyed?.() ||
    event?.sender !== webContents ||
    !senderFrame ||
    senderFrame !== webContents.mainFrame
  ) {
    return false
  }

  return Boolean(isAllowedUrl(senderFrame.url))
}

module.exports = {isTrustedIpcSender}
