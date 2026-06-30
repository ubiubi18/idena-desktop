// eslint-disable-next-line import/no-extraneous-dependencies
const electron = require('electron')

const {clipboard, nativeImage, ipcRenderer, shell, webFrame} = electron

const levelup = require('levelup')
const leveldown = require('leveldown')
const sub = require('subleveldown')

const {APP_INFO_COMMAND, WINDOW_COMMAND} = require('./channels')
const flips = require('./stores/flips')
const invites = require('./stores/invites')
const contacts = require('./stores/contacts')
const logger = require('./logger')
const {prepareDb, dbPath} = require('./stores/setup')

function getAppInfo() {
  try {
    return ipcRenderer.sendSync(APP_INFO_COMMAND) || {}
  } catch {
    return {}
  }
}

const appInfo = getAppInfo()
const [locale] = String(appInfo.locale || 'en').split('-')
const isDev =
  process.env.NODE_ENV === 'development' ||
  process.env.ELECTRON_IS_DEV === '1' ||
  process.defaultApp === true

process.once('loaded', () => {
  global.ipcRenderer = ipcRenderer
  global.openExternal = shell.openExternal

  global.flipStore = flips
  global.invitesDb = invites
  global.contactsDb = contacts

  global.logger = logger

  global.isDev = isDev
  global.isTest = process.env.NODE_ENV === 'e2e'

  global.prepareDb = prepareDb
  global.isMac = process.platform === 'darwin'

  global.clipboard = clipboard
  global.nativeImage = nativeImage
  global.locale = locale

  global.getZoomLevel = () => webFrame.getZoomLevel()
  global.setZoomLevel = (level) => webFrame.setZoomLevel(level)

  global.appVersion = appInfo.version || '0.0.0'

  global.env = {
    NODE_ENV: process.env.NODE_ENV,
    NODE_MOCK: process.env.NODE_MOCK,
    BUMP_EXTRA_FLIPS: process.env.BUMP_EXTRA_FLIPS,
    FINALIZE_FLIPS: process.env.FINALIZE_FLIPS,
    INDEXER_URL: process.env.INDEXER_URL,
  }

  global.toggleFullScreen = () => {
    ipcRenderer.send(WINDOW_COMMAND, 'toggle-full-screen')
  }

  global.levelup = levelup
  global.leveldown = leveldown
  global.dbPath = dbPath
  global.sub = sub

  // eslint-disable-next-line global-require
  global.Buffer = require('buffer').Buffer
})
