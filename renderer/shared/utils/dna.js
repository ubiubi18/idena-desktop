/* global BigInt */

const DNA_BASE = 1000000000000000000n
const DNA_DECIMALS = 18

function toBigInt(value) {
  if (value === null || value === undefined) return 0n
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(value)
  if (typeof value === 'string') return BigInt(value || 0)

  return Array.from(value).reduce(
    (result, byte) => result * 256n + BigInt(byte),
    0n
  )
}

export function dnaToFloatString(value) {
  const atoms = toBigInt(value)
  const whole = atoms / DNA_BASE
  const fraction = atoms % DNA_BASE

  if (fraction === 0n) return whole.toString()

  return `${whole}.${fraction
    .toString()
    .padStart(DNA_DECIMALS, '0')
    .replace(/0+$/, '')}`
}
