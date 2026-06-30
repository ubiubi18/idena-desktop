import root from './proto/models_pb'
import {hexToUint8Array, toHexString} from '../utils/buffers'

export class Transaction {
  constructor() {
    this.nonce = 0
    this.epoch = 0
    this.type = 0
    this.to = null
    this.amount = new Uint8Array()
    this.maxFee = new Uint8Array()
    this.tips = new Uint8Array()
    this.payload = new Uint8Array()
    this.signature = new Uint8Array()
  }

  static fromHex(hex) {
    return new Transaction().fromHex(hex)
  }

  fromHex(hex) {
    return this.fromBytes(hexToUint8Array(hex))
  }

  fromBytes(bytes) {
    const protoTx = root.ProtoTransaction.deserializeBinary(bytes)
    const protoTxData = protoTx.getData()

    if (protoTxData) {
      const to = protoTxData.getTo_asU8()

      this.nonce = protoTxData.getNonce()
      this.epoch = protoTxData.getEpoch()
      this.type = protoTxData.getType()
      this.to = to.length > 0 ? toHexString(to, true) : null
      this.amount = protoTxData.getAmount_asU8()
      this.maxFee = protoTxData.getMaxfee_asU8()
      this.tips = protoTxData.getTips_asU8()
      this.payload = protoTxData.getPayload_asU8()
    }

    this.signature = protoTx.getSignature_asU8()

    return this
  }
}
