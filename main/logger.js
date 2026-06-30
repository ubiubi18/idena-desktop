const {platform} = require('process')
const path = require('path')
const pino = require('pino')

const appDataPath = require('./app-data-path')

const getSystemVersion =
  process.getSystemVersion || (() => process.version.replace(/^v/, 'node-'))

const redactPaths = [
  'apiKey',
  '*.apiKey',
  'data.apiKey',
  'settings.internalApiKey',
  'settings.externalApiKey',
  'internalApiKey',
  'externalApiKey',
  'key',
  '*.key',
  'data.key',
  'params[*].key',
  'password',
  '*.password',
  'data.password',
  'params[*].password',
  'token',
  '*.token',
  'data.token',
  'signature',
  '*.signature',
  'data.signature',
  'privateKey',
  '*.privateKey',
  'encodedPrivateKey',
  '*.encodedPrivateKey',
  'encryptedPrivateKey',
  '*.encryptedPrivateKey',
  'hex',
  'data[*].hex',
  'flips[*].hex',
  'flips[*].publicHex',
  'flips[*].privateHex',
  'flips[*].pics',
  'flips[*].urls',
  'context.shortFlips[*].hex',
  'context.longFlips[*].hex',
  'context.shortFlips[*].publicHex',
  'context.longFlips[*].publicHex',
  'context.shortFlips[*].privateHex',
  'context.longFlips[*].privateHex',
  'context.shortFlips[*].images',
  'context.longFlips[*].images',
]

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    base: {pid: process.pid, os: `${platform} ${getSystemVersion()}`},
    redact: {
      paths: redactPaths,
      censor: '[redacted]',
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  },
  path.join(appDataPath('logs'), 'idena.log')
)

module.exports = logger
