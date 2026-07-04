#!/usr/bin/env node

const {execFileSync, spawnSync} = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ELECTRON_BUILDER_CLI = require.resolve('electron-builder/out/cli/cli')
const MAC_PLATFORM_FLAGS = new Set(['--mac', '-m'])
const WIN_PLATFORM_FLAGS = new Set(['--win', '-w'])
const LINUX_PLATFORM_FLAGS = new Set(['--linux', '-l'])
const PROJECT_DIR_FLAGS = new Set(['--projectDir', '--project'])
const NON_MAC_PLATFORM_FLAGS = new Set([
  ...WIN_PLATFORM_FLAGS,
  ...LINUX_PLATFORM_FLAGS,
])
const ARCH_FLAGS = new Set([
  '--arm64',
  '--x64',
  '--ia32',
  '--armv7l',
  '--universal',
])
const UNSAFE_ELECTRON_BUILDER_PATH_RE = /[\0\r\n"'`$;&|<>]/u

function detectMacMachineArch() {
  try {
    const appleSiliconAvailable = execFileSync(
      '/usr/sbin/sysctl',
      ['-in', 'hw.optional.arm64'],
      {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}
    )
      .trim()
      .toLowerCase()

    if (appleSiliconAvailable === '1') {
      return 'arm64'
    }
  } catch {
    // Fall back to process.arch below.
  }

  return process.arch === 'arm64' ? 'arm64' : 'x64'
}

function includesAny(argv, flags) {
  return argv.some((arg) => flags.has(arg))
}

function shouldAppendMacArch(argv) {
  if (process.platform !== 'darwin') {
    return false
  }

  if (includesAny(argv, ARCH_FLAGS)) {
    return false
  }

  const targetsMac = includesAny(argv, MAC_PLATFORM_FLAGS)
  const targetsNonMacOnly =
    includesAny(argv, NON_MAC_PLATFORM_FLAGS) && !targetsMac

  return !targetsNonMacOnly
}

function shouldUseSafeProjectDir(argv) {
  if (process.platform !== 'darwin') {
    return false
  }

  if (!UNSAFE_ELECTRON_BUILDER_PATH_RE.test(process.cwd())) {
    return false
  }

  if (argv.some((arg) => PROJECT_DIR_FLAGS.has(arg))) {
    return false
  }

  if (argv.some((arg) => arg.startsWith('--projectDir='))) {
    return false
  }

  if (argv.some((arg) => arg.startsWith('--project='))) {
    return false
  }

  const targetsMac = includesAny(argv, MAC_PLATFORM_FLAGS)
  const targetsNonMacOnly =
    includesAny(argv, NON_MAC_PLATFORM_FLAGS) && !targetsMac

  return !targetsNonMacOnly
}

function createSafeProjectDir(projectDir) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'idena-electron-build-')
  )
  const safeProjectDir = path.join(tempRoot, 'project')
  fs.symlinkSync(projectDir, safeProjectDir, 'dir')

  return {safeProjectDir, tempRoot}
}

const args = process.argv.slice(2)
let safeProjectDirState

if (shouldAppendMacArch(args)) {
  const targetArch = detectMacMachineArch()
  args.push(targetArch === 'arm64' ? '--arm64' : '--x64')
  console.log(
    `[electron-builder-wrapper] Detected macOS machine architecture ${targetArch}; packaging target set to ${targetArch}.`
  )
}

if (shouldUseSafeProjectDir(args)) {
  safeProjectDirState = createSafeProjectDir(process.cwd())
  args.push('--projectDir', safeProjectDirState.safeProjectDir)
  console.log(
    `[electron-builder-wrapper] Project path contains shell-special characters; using safe projectDir ${safeProjectDirState.safeProjectDir}.`
  )
}

const result = spawnSync(process.execPath, [ELECTRON_BUILDER_CLI, ...args], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

if (safeProjectDirState) {
  fs.rmSync(safeProjectDirState.tempRoot, {force: true, recursive: true})
}

if (result.error) {
  console.error(`electron-builder failed: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status || 0)
