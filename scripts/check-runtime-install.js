#!/usr/bin/env node

const {devDependencies} = require('../package.json')

const TARGET_NODE_MAJOR = 24
const MIN_NODE_VERSION = [24, 15, 0]

function parseNodeVersion(value) {
  return String(value || '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
    .slice(0, 3)
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const leftPart = left[index] || 0
    const rightPart = right[index] || 0

    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }

  return 0
}

const nodeVersion = parseNodeVersion(process.versions.node)
const minNodeVersionLabel = MIN_NODE_VERSION.join('.')

if (
  nodeVersion[0] !== TARGET_NODE_MAJOR ||
  compareVersions(nodeVersion, MIN_NODE_VERSION) < 0
) {
  console.error(
    [
      `This repo targets Electron ${devDependencies.electron} and requires Node ${minNodeVersionLabel}+ on Node ${TARGET_NODE_MAJOR}.`,
      `Current Node version: ${process.versions.node}`,
      'Use Node 24 before installing or building this fork.',
    ].join('\n')
  )
  process.exit(1)
}
