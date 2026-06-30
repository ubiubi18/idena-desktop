#!/usr/bin/env node

const fs = require('fs')
const {execFileSync} = require('child_process')

const githubWarningLimitBytes = 50 * 1024 * 1024
const githubHardLimitGuardBytes = 95 * 1024 * 1024

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function listTrackedFiles() {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']}
  )
    .split('\0')
    .filter(Boolean)
}

const failures = []

for (const filePath of listTrackedFiles()) {
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      if (stat.size >= githubHardLimitGuardBytes) {
        failures.push(
          `${filePath} is ${formatMb(
            stat.size
          )}; move it to Git LFS or release artifacts before publishing`
        )
      } else if (stat.size >= githubWarningLimitBytes) {
        failures.push(
          `${filePath} is ${formatMb(
            stat.size
          )}; new large tracked files must use Git LFS or release artifacts`
        )
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Release artifact check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Release artifact check passed.')
