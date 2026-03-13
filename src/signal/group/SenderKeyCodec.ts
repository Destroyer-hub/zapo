import { readVersionedContent, toSerializedPubKey } from '@crypto'
import { proto } from '@proto'
import { SIGNATURE_SIZE, SIGNAL_GROUP_VERSION } from '@signal/constants'
import { toBytesView } from '@util/bytes'

export interface ParsedDistributionPayload {
    readonly keyId: number
    readonly iteration: number
    readonly chainKey: Uint8Array
    readonly signingPublicKey: Uint8Array
}

export interface ParsedSenderKeyMessage {
    readonly keyId: number
    readonly iteration: number
    readonly ciphertext: Uint8Array
    readonly versionContentMac: Uint8Array
}

export function parseDistributionPayload(payload: Uint8Array): ParsedDistributionPayload {
    const body = readVersionedContent(payload, SIGNAL_GROUP_VERSION, 0)
    const decoded = proto.SenderKeyDistributionMessage.decode(body)
    if (
        decoded.id === null ||
        decoded.id === undefined ||
        decoded.iteration === null ||
        decoded.iteration === undefined ||
        decoded.chainKey === null ||
        decoded.chainKey === undefined ||
        decoded.signingKey === null ||
        decoded.signingKey === undefined
    ) {
        throw new Error('invalid sender key distribution message')
    }

    const chainKey = toBytesView(decoded.chainKey)
    if (chainKey.length !== 32) {
        throw new Error('sender key distribution chainKey must be 32 bytes')
    }

    return {
        keyId: decoded.id,
        iteration: decoded.iteration,
        chainKey,
        signingPublicKey: toSerializedPubKey(toBytesView(decoded.signingKey))
    }
}

export function parseSenderKeyMessage(versionContentMac: Uint8Array): ParsedSenderKeyMessage {
    const body = readVersionedContent(versionContentMac, SIGNAL_GROUP_VERSION, SIGNATURE_SIZE)
    const decoded = proto.SenderKeyMessage.decode(body)
    if (
        decoded.id === null ||
        decoded.id === undefined ||
        decoded.iteration === null ||
        decoded.iteration === undefined ||
        decoded.ciphertext === null ||
        decoded.ciphertext === undefined
    ) {
        throw new Error('invalid sender key message')
    }

    return {
        keyId: decoded.id,
        iteration: decoded.iteration,
        ciphertext: toBytesView(decoded.ciphertext),
        versionContentMac
    }
}
