import { base64ToBytes as decodeBase64, bytesToBase64, bytesToBase64UrlSafe } from '@util/bytes'

export { bytesToBase64, bytesToBase64UrlSafe }

export function base64ToBytes(value: string, field: string, requireNonEmpty = true): Uint8Array {
    const out = decodeBase64(value)
    if (requireNonEmpty && out.length === 0) {
        throw new Error(`invalid base64 payload for ${field}`)
    }
    return out
}

export function decodeProtoBytes(
    value: Uint8Array | string | null | undefined,
    field: string
): Uint8Array {
    if (value === null || value === undefined) {
        throw new Error(`missing protobuf bytes field ${field}`)
    }
    if (value instanceof Uint8Array) {
        return value
    }
    return decodeBase64(value)
}
