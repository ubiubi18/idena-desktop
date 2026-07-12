#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const LOCK_PATH = path.join(ROOT, 'compatibility', 'stack-lock.json')
const SOURCES_PATH = path.join(ROOT, 'scripts', 'source-manifest.json')
const SHA1_PATTERN = /^[0-9a-f]{40}$/

function readJson(filePath) {
  const metadata = fs.lstatSync(filePath)
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${path.basename(filePath)} must be a regular file`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function verifyCompatibilityLock(lock, sources) {
  if (
    lock.schema !== 1 ||
    lock.releaseId !== 'idena-mainnet-legacy-compat-2026.07.12-rc3' ||
    lock.status !== 'candidate'
  ) {
    throw new Error('Unexpected compatibility lock identity')
  }
  if (lock.chainInvariants?.consensusChangesAllowed !== false) {
    throw new Error('Compatibility lock permits consensus changes')
  }

  const components = new Map()
  for (const component of lock.components || []) {
    if (!component?.name || !SHA1_PATTERN.test(component.commit || '')) {
      throw new Error('Compatibility lock contains an invalid component')
    }
    if (components.has(component.name)) {
      throw new Error(`Duplicate compatibility component: ${component.name}`)
    }
    components.set(component.name, component.commit)
  }

  const expected = lock.consumerPins?.['idena-desktop']
  if (!expected || Object.keys(expected).length !== 2) {
    throw new Error('Compatibility lock is missing desktop consumer pins')
  }
  const manifestSources = new Map(
    (sources.sources || []).map((source) => [source.name, source])
  )
  for (const [name, commit] of Object.entries(expected)) {
    const source = manifestSources.get(name)
    if (
      !source ||
      source.commit !== commit ||
      components.get(name) !== commit
    ) {
      throw new Error(`${name} does not match the desktop compatibility pin`)
    }
    if (source.url !== `https://github.com/ubiubi18/${name}.git`) {
      throw new Error(`${name} uses an unexpected source repository`)
    }
  }
  if (manifestSources.size !== Object.keys(expected).length) {
    throw new Error('Desktop source manifest contains an unreviewed component')
  }
}

function main() {
  verifyCompatibilityLock(readJson(LOCK_PATH), readJson(SOURCES_PATH))
  console.log('Desktop compatibility lock passed')
}

if (require.main === module) main()

module.exports = {verifyCompatibilityLock}
