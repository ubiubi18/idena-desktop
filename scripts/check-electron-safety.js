#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const {execFileSync} = require('child_process')

const scannedPrefixes = ['main/', 'renderer/']
const scannedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])

const blockedPatterns = [
  {
    name: 'dynamic Function constructor',
    regex: /\b(?:new\s+)?Function\s*\(/g,
  },
  {
    name: 'electron.remote namespace',
    regex: /\belectron\s*\.\s*remote\b/g,
  },
  {
    name: 'require("electron").remote',
    regex: /\brequire\s*\(\s*['"]electron['"]\s*\)\s*\.\s*remote\b/g,
  },
  {
    name: '@electron/remote package',
    regex: /['"]@electron\/remote['"]/g,
  },
  {
    name: 'remote destructured from electron require',
    regex:
      /\b(?:const|let|var)\s*\{[^}]*\bremote\b[^}]*\}\s*=\s*require\s*\(\s*['"]electron['"]\s*\)/g,
  },
  {
    name: 'remote destructured from imported electron object',
    regex: /\b(?:const|let|var)\s*\{[^}]*\bremote\b[^}]*\}\s*=\s*electron\b/g,
  },
  {
    name: 'remote imported from electron',
    regex: /\bimport\s*\{[^}]*\bremote\b[^}]*\}\s*from\s*['"]electron['"]/g,
  },
  {
    name: 'enableRemoteModule enabled',
    regex: /\benableRemoteModule\s*:\s*true\b/g,
  },
  {
    name: 'raw shell.openExternal call',
    regex: /\bshell\s*\.\s*openExternal\s*\(/g,
  },
  {
    name: 'raw shell.openExternal preload exposure',
    regex: /\bglobal\s*\.\s*openExternal\s*=\s*shell\s*\.\s*openExternal\b/g,
  },
  {
    name: 'raw ipcRenderer preload exposure',
    regex: /\bglobal\s*\.\s*ipcRenderer\s*=\s*ipcRenderer\b/g,
  },
  {
    name: 'raw clipboard preload exposure',
    regex: /\bglobal\s*\.\s*clipboard\s*=\s*clipboard\b/g,
  },
  {
    name: 'raw nativeImage preload exposure',
    regex: /\bglobal\s*\.\s*nativeImage\s*=\s*nativeImage\b/g,
  },
  {
    name: 'privileged Node preload exposure',
    regex:
      /\b(?:global\s*\.\s*|expose\s*\(\s*['"])(?:Buffer|dbPath|leveldown|levelup|prepareDb|sub)\b/g,
  },
]

function listTrackedFiles() {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    {encoding: 'utf8'}
  )
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function shouldScan(filePath) {
  return (
    scannedPrefixes.some((prefix) => filePath.startsWith(prefix)) &&
    scannedExtensions.has(path.extname(filePath).toLowerCase())
  )
}

function findPatternMatches(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const fileFindings = []

  for (const pattern of blockedPatterns) {
    pattern.regex.lastIndex = 0
    let match = pattern.regex.exec(content)
    while (match) {
      fileFindings.push({
        filePath,
        line: content.slice(0, match.index).split('\n').length,
        name: pattern.name,
        value: match[0],
      })
      match = pattern.regex.exec(content)
    }
  }

  return fileFindings
}

const findings = listTrackedFiles()
  .filter(shouldScan)
  .flatMap((filePath) => findPatternMatches(filePath))

const mainIndex = fs.existsSync('main/index.js')
  ? fs.readFileSync('main/index.js', 'utf8')
  : ''
if (!/\bnodeIntegration\s*:\s*false\b/.test(mainIndex)) {
  findings.push({
    filePath: 'main/index.js',
    line: 1,
    name: 'main window nodeIntegration guard',
    value: 'nodeIntegration: false missing',
  })
}

if (!/\bcontextIsolation\s*:\s*true\b/.test(mainIndex)) {
  findings.push({
    filePath: 'main/index.js',
    line: 1,
    name: 'main window context isolation guard',
    value: 'contextIsolation: true missing',
  })
}

if (!/\bsetWindowOpenHandler\s*\(/.test(mainIndex)) {
  findings.push({
    filePath: 'main/index.js',
    line: 1,
    name: 'main window new-window guard',
    value: 'setWindowOpenHandler missing',
  })
}

if (!/\bwill-navigate\b/.test(mainIndex)) {
  findings.push({
    filePath: 'main/index.js',
    line: 1,
    name: 'main window navigation guard',
    value: 'will-navigate guard missing',
  })
}

if (
  !/\bisTrustedIpcSender\s*\(/.test(mainIndex) ||
  !/\brequireIpcSender\s*\(/.test(mainIndex)
) {
  findings.push({
    filePath: 'main/index.js',
    line: 1,
    name: 'IPC sender validation',
    value: 'trusted sender/origin guard missing',
  })
}

if (
  !/\bregisterRendererScheme\s*\(\s*protocol\s*\)/.test(mainIndex) ||
  !/\binstallRendererProtocol\s*\(\s*\{/.test(mainIndex)
) {
  findings.push({
    filePath: 'main/index.js',
    line: 1,
    name: 'secure packaged renderer protocol',
    value: 'renderer protocol registration or installation missing',
  })
}

const rendererProtocol = fs.existsSync('main/renderer-protocol.js')
  ? fs.readFileSync('main/renderer-protocol.js', 'utf8')
  : ''
if (
  !/\bstandard\s*:\s*true\b/.test(rendererProtocol) ||
  !/\bsecure\s*:\s*true\b/.test(rendererProtocol) ||
  !/\bpath\s*\.\s*relative\s*\(/.test(rendererProtocol) ||
  !/\bpath\s*\.\s*isAbsolute\s*\(/.test(rendererProtocol)
) {
  findings.push({
    filePath: 'main/renderer-protocol.js',
    line: 1,
    name: 'packaged renderer origin confinement',
    value: 'secure scheme or path-confinement guard missing',
  })
}

const preload = fs.existsSync('main/preload.js')
  ? fs.readFileSync('main/preload.js', 'utf8')
  : ''
if (
  !/\bexpose\s*\(\s*['"]openExternal['"]\s*,[\s\S]*?openExternalUrl\s*\(/.test(
    preload
  )
) {
  findings.push({
    filePath: 'main/preload.js',
    line: 1,
    name: 'safe external URL preload bridge',
    value: 'openExternalUrl bridge missing',
  })
}

if (
  !/\bconst\s+safeIpcRenderer\s*=\s*createSafeIpcRenderer\s*\(\s*ipcRenderer\s*\)[\s\S]*?\bexpose\s*\(\s*['"]ipcRenderer['"]\s*,\s*safeIpcRenderer\s*\)/.test(
    preload
  )
) {
  findings.push({
    filePath: 'main/preload.js',
    line: 1,
    name: 'safe ipcRenderer preload bridge',
    value: 'createSafeIpcRenderer bridge missing',
  })
}

if (
  !/\bconst\s+safeImageBridge\s*=\s*createSafeImageBridge\s*\(\s*\{\s*clipboard\s*,\s*nativeImage\s*\}\s*\)[\s\S]*?\bexpose\s*\(\s*['"]clipboard['"][\s\S]*?\breadImageDataURL\s*:\s*safeImageBridge\s*\.\s*readImageDataURL[\s\S]*?\bexpose\s*\(\s*['"]image['"][\s\S]*?\bresizeDataURL\s*:\s*safeImageBridge\s*\.\s*resizeDataURL/.test(
    preload
  )
) {
  findings.push({
    filePath: 'main/preload.js',
    line: 1,
    name: 'safe image preload bridge',
    value: 'createSafeImageBridge bridge missing',
  })
}

if (!/\bcontextBridge\s*\.\s*exposeInMainWorld\s*\(/.test(preload)) {
  findings.push({
    filePath: 'main/preload.js',
    line: 1,
    name: 'contextBridge preload exposure',
    value: 'contextBridge.exposeInMainWorld missing',
  })
}

if (
  !/RENDERER_CONTENT_SECURITY_POLICY/u.test(rendererProtocol) ||
  !/["']script-src 'self'["']/u.test(rendererProtocol) ||
  !/headers\s*\.\s*set\s*\(\s*['"]Content-Security-Policy['"]/u.test(
    rendererProtocol
  ) ||
  /unsafe-eval/u.test(rendererProtocol)
) {
  findings.push({
    filePath: 'main/renderer-protocol.js',
    line: 1,
    name: 'renderer content security policy',
    value: 'strict CSP response header missing or unsafe-eval enabled',
  })
}

if (findings.length > 0) {
  console.error('Electron safety check failed:')
  for (const finding of findings) {
    console.error(
      `- ${finding.filePath}:${finding.line} ${finding.name}: ${finding.value}`
    )
  }
  process.exit(1)
}

console.log('Electron safety check passed.')
