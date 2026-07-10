#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const {spawn} = require('child_process')

const packagedExecutable = process.env.IDENA_E2E_EXECUTABLE
const executable = packagedExecutable
  ? path.resolve(packagedExecutable)
  : require('electron')

const userDataDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'idena-electron-smoke-')
)
const args = [
  ...(packagedExecutable ? [] : ['.']),
  `--user-data-dir=${userDataDirectory}`,
]
const timeoutMs = 45_000
let output = ''
let timedOut = false

function modeBits(filePath) {
  // eslint-disable-next-line no-bitwise
  return fs.statSync(filePath).mode & 0o777
}

function verifyPrivateProfileFiles(profileDirectory) {
  if (process.platform === 'win32') return

  const appProfileDirectory = path.join(profileDirectory, 'tests')
  if (modeBits(appProfileDirectory) !== 0o700) {
    throw new Error('Electron profile directory is not private')
  }

  for (const name of ['settings.json', 'invites.json', 'flips.json']) {
    const filePath = path.join(appProfileDirectory, name)
    if (modeBits(filePath) !== 0o600) {
      throw new Error(`${name} is not private`)
    }
  }
}

function append(chunk, stream) {
  const text = String(chunk)
  output += text
  stream.write(text)
}

if (!fs.existsSync(executable)) {
  console.error(`Electron executable does not exist: ${executable}`)
  process.exit(1)
}

const child = spawn(executable, args, {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    IDENA_E2E_SMOKE: '1',
    NODE_ENV: 'e2e',
    NODE_MOCK: process.env.NODE_MOCK || 'http://127.0.0.1:12345',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

child.stdout.on('data', (chunk) => append(chunk, process.stdout))
child.stderr.on('data', (chunk) => append(chunk, process.stderr))

const timeout = setTimeout(() => {
  timedOut = true
  child.kill('SIGTERM')
  setTimeout(() => child.kill('SIGKILL'), 2_000).unref()
}, timeoutMs)

child.on('error', (error) => {
  clearTimeout(timeout)
  fs.rmSync(userDataDirectory, {force: true, recursive: true})
  console.error(`Electron smoke test could not start: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  let permissionError = null
  if (!timedOut && code === 0) {
    try {
      verifyPrivateProfileFiles(userDataDirectory)
    } catch (error) {
      permissionError = error
    }
  }
  fs.rmSync(userDataDirectory, {force: true, recursive: true})

  if (timedOut) {
    console.error(`Electron smoke test timed out after ${timeoutMs} ms`)
    process.exit(1)
  }
  if (code !== 0) {
    console.error(
      `Electron smoke test exited with code ${code ?? 'null'}${
        signal ? ` (${signal})` : ''
      }`
    )
    process.exit(1)
  }
  if (permissionError) {
    console.error(`Electron smoke test: ${permissionError.message}`)
    process.exit(1)
  }
  const fatalOutput = [
    /Unable to load preload script/iu,
    /Uncaught (?:Error|TypeError|ReferenceError)/iu,
    /Electron Security Warning/iu,
  ].find((pattern) => pattern.test(output))
  if (fatalOutput) {
    console.error(`Electron smoke test found fatal output: ${fatalOutput}`)
    process.exit(1)
  }
  if (
    !output.includes(
      '[e2e-smoke] ready: renderer hydrated with scripts, styles, logo, and navigation'
    )
  ) {
    console.error(
      'Electron smoke test exited without the renderer-ready marker'
    )
    process.exit(1)
  }

  console.log('Electron smoke test passed.')
})
