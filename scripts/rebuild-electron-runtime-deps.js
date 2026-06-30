#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const {spawnSync} = require('child_process')
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const {rebuild} = require('@electron/rebuild')
const pkg = require('../package.json')

const ROOT = path.join(__dirname, '..')
const RUNTIME_NATIVE_MODULES = ['leveldown', 'secp256k1']

function hasWhitespacePathSegment(value) {
  return /\s/.test(String(value || ''))
}

function isInstalledModule(moduleName) {
  return fs.existsSync(path.join(ROOT, 'node_modules', moduleName))
}

function getInstalledRuntimeNativeModules() {
  return RUNTIME_NATIVE_MODULES.filter(isInstalledModule)
}

function readCommandOutput(command, args) {
  const result = spawnSync(command, args, {encoding: 'utf8'})
  return String(result.stdout || '').trim()
}

function detectRebuildArch() {
  if (process.platform !== 'darwin') {
    return undefined
  }

  const supportsArm64 = readCommandOutput('/usr/sbin/sysctl', [
    '-in',
    'hw.optional.arm64',
  ])
  if (supportsArm64 === '1') {
    return 'arm64'
  }

  const machineArch = readCommandOutput('/usr/bin/uname', ['-m'])
  return machineArch === 'arm64' ? 'arm64' : undefined
}

async function main() {
  if (hasWhitespacePathSegment(ROOT)) {
    console.warn(
      [
        'Skipping Electron native module rebuild because this checkout path contains whitespace.',
        'node-gyp still breaks old native addon include paths in that layout.',
        'The current native dependencies ship N-API prebuilds; move the checkout to a path without spaces if a full rebuild is required.',
      ].join(' ')
    )
    return
  }

  const installedRuntimeNativeModules = getInstalledRuntimeNativeModules()

  if (installedRuntimeNativeModules.length === 0) {
    return
  }

  await rebuild({
    buildPath: ROOT,
    electronVersion: pkg.devDependencies.electron,
    arch: detectRebuildArch(),
    force: true,
    mode: 'sequential',
    onlyModules: installedRuntimeNativeModules,
  })
}

main().catch((error) => {
  console.error(
    `Failed to rebuild Electron runtime native modules (${getInstalledRuntimeNativeModules().join(
      ', '
    )}): ${error.message}`
  )
  process.exit(1)
})
