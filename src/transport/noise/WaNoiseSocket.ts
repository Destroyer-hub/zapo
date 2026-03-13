import { type CryptoKey, aesGcmDecrypt, aesGcmEncrypt, buildNonce } from '@crypto'

export class WaNoiseSocket {
    private readonly encryptKey: CryptoKey
    private readonly decryptKey: CryptoKey
    private writeCounter: number
    private readCounter: number

    public constructor(encryptKey: CryptoKey, decryptKey: CryptoKey) {
        this.encryptKey = encryptKey
        this.decryptKey = decryptKey
        this.writeCounter = 0
        this.readCounter = 0
    }

    public async encrypt(frame: Uint8Array, additionalData?: Uint8Array): Promise<Uint8Array> {
        const nonce = buildNonce(this.writeCounter++)
        return aesGcmEncrypt(this.encryptKey, nonce, frame, additionalData)
    }

    public async decrypt(frame: Uint8Array, additionalData?: Uint8Array): Promise<Uint8Array> {
        const nonce = buildNonce(this.readCounter++)
        return aesGcmDecrypt(this.decryptKey, nonce, frame, additionalData)
    }
}
