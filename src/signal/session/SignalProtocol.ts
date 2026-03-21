import { toSerializedPubKey } from '@crypto'
import { ConsoleLogger } from '@infra/log/ConsoleLogger'
import type { Logger } from '@infra/log/types'
import { MAX_PREV_SESSIONS } from '@signal/constants'
import { decryptMsg, decryptMsgFromSession, encryptMsg } from '@signal/session/SignalRatchet'
import type { DecryptOutcome } from '@signal/session/SignalRatchet'
import {
    deserializeMsg,
    deserializePkMsg,
    requirePreKey,
    requireSignedPreKey
} from '@signal/session/SignalSerializer'
import {
    detachSession,
    findMatchingSession,
    generateSerializedKeyPair,
    initiateSessionIncoming,
    initiateSessionOutgoing,
    requireLocalIdentity,
    toSerializedKeyPair
} from '@signal/session/SignalSession'
import type {
    ParsedPreKeySignalMessage,
    ParsedSignalMessage,
    SignalAddress,
    SignalPreKeyBundle,
    SignalSessionRecord
} from '@signal/types'
import type { WaSignalStore } from '@store/contracts/signal.store'
import { uint8Equal } from '@util/bytes'

function signalAddressMapKey(address: SignalAddress): string {
    return `${address.user}\u0001${address.server ?? ''}\u0001${address.device}`
}

export class SignalProtocol {
    private readonly store: WaSignalStore
    private readonly logger: Logger

    public constructor(store: WaSignalStore, logger: Logger = new ConsoleLogger('info')) {
        this.store = store
        this.logger = logger
    }

    public async hasSession(address: SignalAddress): Promise<boolean> {
        return this.store.hasSession(address)
    }

    public async hasSessions(addresses: readonly SignalAddress[]): Promise<readonly boolean[]> {
        return this.store.hasSessions(addresses)
    }

    public async establishOutgoingSession(
        address: SignalAddress,
        remoteBundle: SignalPreKeyBundle
    ): Promise<SignalSessionRecord> {
        const [local, localOneTimeBase] = await Promise.all([
            requireLocalIdentity(this.store),
            generateSerializedKeyPair()
        ])
        const session = await initiateSessionOutgoing(local, remoteBundle, localOneTimeBase)
        await this.store.setRemoteIdentity(address, session.remote.pubKey)
        await this.store.setSession(address, session)
        return session
    }

    public async encryptMessage(
        address: SignalAddress,
        plaintext: Uint8Array,
        expectedIdentity?: Uint8Array
    ): Promise<{
        readonly type: 'msg' | 'pkmsg'
        readonly ciphertext: Uint8Array
        readonly baseKey: Uint8Array | null
    }> {
        const [encrypted] = await this.encryptMessagesBatch([
            { address, plaintext, expectedIdentity }
        ])
        return encrypted
    }

    public async encryptMessagesBatch(
        requests: readonly {
            readonly address: SignalAddress
            readonly plaintext: Uint8Array
            readonly expectedIdentity?: Uint8Array
        }[]
    ): Promise<
        readonly {
            readonly type: 'msg' | 'pkmsg'
            readonly ciphertext: Uint8Array
            readonly baseKey: Uint8Array | null
        }[]
    > {
        if (requests.length === 0) {
            return []
        }

        const addresses = requests.map((request) => request.address)
        const storedSessions = await this.store.getSessionsBatch(addresses)
        const latestSessionByAddress = new Map<string, SignalSessionRecord>()
        const sessionUpdatesByAddress = new Map<
            string,
            { readonly address: SignalAddress; readonly session: SignalSessionRecord }
        >()
        const identityUpdatesByAddress = new Map<
            string,
            { readonly address: SignalAddress; readonly identityKey: Uint8Array }
        >()
        const results = new Array<{
            readonly type: 'msg' | 'pkmsg'
            readonly ciphertext: Uint8Array
            readonly baseKey: Uint8Array | null
        }>(requests.length)

        for (let index = 0; index < requests.length; index += 1) {
            const request = requests[index]
            const address = request.address
            const addressKey = signalAddressMapKey(address)
            const session = latestSessionByAddress.get(addressKey) ?? storedSessions[index]
            if (!session) {
                throw new Error('signal session not found')
            }
            if (
                request.expectedIdentity &&
                !uint8Equal(toSerializedPubKey(request.expectedIdentity), session.remote.pubKey)
            ) {
                throw new Error('identity mismatch')
            }

            const [updatedSession, encrypted] = await encryptMsg(session, request.plaintext)
            latestSessionByAddress.set(addressKey, updatedSession)
            sessionUpdatesByAddress.set(addressKey, {
                address,
                session: updatedSession
            })
            if (!uint8Equal(updatedSession.remote.pubKey, session.remote.pubKey)) {
                identityUpdatesByAddress.set(addressKey, {
                    address,
                    identityKey: updatedSession.remote.pubKey
                })
            }
            results[index] = {
                ...encrypted,
                baseKey: updatedSession.aliceBaseKey
            }
        }

        await this.store.setSessionsBatch([...sessionUpdatesByAddress.values()])
        if (identityUpdatesByAddress.size > 0) {
            await this.store.setRemoteIdentities([...identityUpdatesByAddress.values()])
        }
        return results
    }

    public async decryptMessage(
        address: SignalAddress,
        envelope: {
            readonly type: 'msg' | 'pkmsg'
            readonly ciphertext: Uint8Array
        }
    ): Promise<Uint8Array> {
        const currentSession = await this.store.getSession(address)

        let outcome: DecryptOutcome
        if (envelope.type === 'pkmsg') {
            const parsedPk = deserializePkMsg(envelope.ciphertext)
            outcome = await this.decryptPkMsg(currentSession, parsedPk)
        } else {
            const parsed = deserializeMsg(envelope.ciphertext)
            outcome = await this.decryptMsgInternal(currentSession, parsed)
        }

        const nextRemoteIdentity =
            outcome.newSessionInfo?.newIdentity ?? outcome.updatedSession.remote.pubKey
        if (!currentSession || !uint8Equal(currentSession.remote.pubKey, nextRemoteIdentity)) {
            await this.store.setRemoteIdentity(address, nextRemoteIdentity)
        }
        await this.store.setSession(address, outcome.updatedSession)
        return outcome.plaintext
    }

    private async decryptMsgInternal(
        session: SignalSessionRecord | null,
        parsed: ParsedSignalMessage
    ): Promise<DecryptOutcome> {
        return decryptMsg(session, parsed, (error, previousSessionIndex) => {
            this.logger.debug('signal decrypt fallback session failed', {
                previousSessionIndex,
                message: error.message
            })
        })
    }

    private async decryptPkMsg(
        currentSession: SignalSessionRecord | null,
        parsed: ParsedPreKeySignalMessage
    ): Promise<DecryptOutcome> {
        const matchingSession = findMatchingSession(currentSession, parsed.sessionBaseKey)
        if (matchingSession) {
            const [updatedSession, plaintext] = await decryptMsgFromSession(matchingSession, parsed)
            return {
                updatedSession,
                plaintext,
                newSessionInfo: null
            }
        }

        const [local, signedPreKey, oneTimePreKey] = await Promise.all([
            requireLocalIdentity(this.store),
            requireSignedPreKey(this.store, parsed.localSignedPreKeyId),
            parsed.localOneTimeKeyId === null || parsed.localOneTimeKeyId === undefined
                ? Promise.resolve(null)
                : requirePreKey(this.store, parsed.localOneTimeKeyId)
        ])
        const incoming = await initiateSessionIncoming(
            local,
            parsed.remote,
            parsed.sessionBaseKey,
            {
                signed: toSerializedKeyPair(signedPreKey.keyPair),
                oneTime: oneTimePreKey ? toSerializedKeyPair(oneTimePreKey.keyPair) : undefined,
                ratchet: toSerializedKeyPair(signedPreKey.keyPair)
            }
        )

        const newIdentity =
            !currentSession || !uint8Equal(incoming.remote.pubKey, currentSession.remote.pubKey)
                ? incoming.remote.pubKey
                : null
        const baseSession = currentSession
            ? {
                  ...incoming,
                  prevSessions: [
                      detachSession(currentSession),
                      ...currentSession.prevSessions.slice(0, MAX_PREV_SESSIONS - 1)
                  ]
              }
            : incoming

        const [updatedSession, plaintext] = await decryptMsgFromSession(baseSession, parsed)
        if (parsed.localOneTimeKeyId !== null && parsed.localOneTimeKeyId !== undefined) {
            await this.store.consumePreKeyById(parsed.localOneTimeKeyId)
        }
        return {
            updatedSession,
            plaintext,
            newSessionInfo: {
                newIdentity,
                baseSession,
                usedPreKey: parsed.localOneTimeKeyId
            }
        }
    }
}
