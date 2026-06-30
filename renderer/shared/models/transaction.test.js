import root from './proto/models_pb'
import {Transaction} from './transaction'
import {dnaToFloatString} from '../utils/dna'
import {toHexString} from '../utils/buffers'

function bigintToBytes(value) {
  if (value === 0n) return new Uint8Array()

  const bytes = []
  let rest = value

  while (rest > 0n) {
    bytes.unshift(Number(rest % 256n))
    rest /= 256n
  }

  return new Uint8Array(bytes)
}

describe('Transaction', () => {
  it('decodes raw transactions without idena-sdk-js', () => {
    const data = new root.ProtoTransaction.Data()
    data.setNonce(7)
    data.setEpoch(42)
    data.setType(3)
    data.setTo(Buffer.from('1'.repeat(40), 'hex'))
    data.setAmount(bigintToBytes(1230000000000000000n))
    data.setMaxfee(bigintToBytes(1000000000000000n))
    data.setTips(bigintToBytes(0n))
    data.setPayload(Buffer.from('abcd', 'hex'))

    const protoTx = new root.ProtoTransaction()
    protoTx.setData(data)

    const rawTx = `0x${Buffer.from(protoTx.serializeBinary()).toString('hex')}`
    const decodedTx = Transaction.fromHex(rawTx)

    expect(decodedTx).toMatchObject({
      nonce: 7,
      epoch: 42,
      type: 3,
      to: `0x${'1'.repeat(40)}`,
    })
    expect(dnaToFloatString(decodedTx.amount)).toBe('1.23')
    expect(dnaToFloatString(decodedTx.maxFee)).toBe('0.001')
    expect(dnaToFloatString(decodedTx.tips)).toBe('0')
    expect(toHexString(decodedTx.payload, true)).toBe('0xabcd')
  })
})
