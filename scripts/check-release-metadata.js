#!/usr/bin/env node

const fs = require('fs')

const failures = []
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const buildNodeScript = fs.readFileSync(
  'scripts/build-node-from-sources.js',
  'utf8'
)
const releaseWorkflow = fs.readFileSync('.github/workflows/release.yml', 'utf8')

function requireCondition(condition, message) {
  if (!condition) failures.push(message)
}

requireCondition(
  packageJson.name === 'idena-desktop',
  'unexpected package name'
)
requireCondition(packageJson.productName === 'Idena', 'unexpected product name')
requireCondition(
  packageJson.engines &&
    packageJson.engines.node === '>=24.18.0 <25' &&
    packageJson.engines.npm === '>=11.16.0',
  'package engines must pin the Node 24 / npm 11 runtime'
)
requireCondition(fs.existsSync('.node-version'), 'missing .node-version')
requireCondition(fs.existsSync('.nvmrc'), 'missing .nvmrc')
requireCondition(
  /IDENA_GO_GOTOOLCHAIN\s*\|\|\s*['"]go1\.26\.4['"]/.test(buildNodeScript),
  'bundled node source build must default to Go 1.26.4'
)

const scripts = packageJson.scripts || {}
requireCondition(
  scripts['prepare:node'] === 'node scripts/prepare-bundled-node.js',
  'package scripts must include prepare:node for bundled idena-go'
)
requireCondition(
  /build\/node\/current\/idena-go\.exe/u.test(
    scripts['build:node:win:x64'] || ''
  ),
  'package scripts must define Windows bundled node output path'
)
requireCondition(
  /build\/node\/current\/idena-go\b/u.test(
    scripts['build:node:mac:arm64'] || ''
  ) &&
    /build\/node\/current\/idena-go\b/u.test(
      scripts['build:node:mac:x64'] || ''
    ),
  'package scripts must define macOS bundled node output paths'
)
requireCondition(
  /npm run prepare:node/u.test(releaseWorkflow),
  'release workflow must prepare the bundled node before packaging'
)

const buildFiles = new Set(
  packageJson.build && Array.isArray(packageJson.build.files)
    ? packageJson.build.files
    : []
)

for (const pattern of [
  '!**/.env',
  '!**/.env.*',
  '!**/*.log',
  '!build',
  '!build/**',
  '!idena-go',
  '!idena-go/**',
  '!idena-wasm',
  '!idena-wasm/**',
  '!idena-wasm-binding',
  '!idena-wasm-binding/**',
  '!renderer',
  'renderer/out',
]) {
  requireCondition(
    buildFiles.has(pattern),
    `package build.files must include ${pattern}`
  )
}

for (const platform of ['mac', 'win', 'linux']) {
  const resources =
    packageJson.build &&
    packageJson.build[platform] &&
    packageJson.build[platform].extraResources
  requireCondition(
    Array.isArray(resources) &&
      resources.some(
        (entry) => entry.from === 'build/node/current' && entry.to === 'node'
      ),
    `build.${platform}.extraResources must include bundled idena-go node`
  )
}

if (failures.length > 0) {
  console.error('Release metadata check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Release metadata check passed.')
