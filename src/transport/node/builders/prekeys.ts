import { WA_DEFAULTS, WA_NODE_TAGS, WA_XMLNS } from '@protocol/constants'
import { SIGNAL_KEY_BUNDLE_TYPE_BYTES } from '@signal/api/constants'
import type { PreKeyRecord, RegistrationInfo, SignedPreKeyRecord } from '@signal/types'
import { buildIqNode } from '@transport/node/query'
import { intToBytes, toBytesView } from '@util/bytes'

export function buildPreKeyUploadIq(
    registrationInfo: RegistrationInfo,
    signedPreKey: SignedPreKeyRecord,
    preKeys: readonly PreKeyRecord[]
) {
    return buildIqNode('set', WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.SIGNAL, [
        {
            tag: WA_NODE_TAGS.REGISTRATION,
            attrs: {},
            content: intToBytes(4, registrationInfo.registrationId)
        },
        {
            tag: WA_NODE_TAGS.TYPE,
            attrs: {},
            content: SIGNAL_KEY_BUNDLE_TYPE_BYTES
        },
        {
            tag: WA_NODE_TAGS.IDENTITY,
            attrs: {},
            content: toBytesView(registrationInfo.identityKeyPair.pubKey)
        },
        {
            tag: WA_NODE_TAGS.LIST,
            attrs: {},
            content: preKeys.map((record) => ({
                tag: WA_NODE_TAGS.KEY,
                attrs: {},
                content: [
                    {
                        tag: WA_NODE_TAGS.ID,
                        attrs: {},
                        content: intToBytes(3, record.keyId)
                    },
                    {
                        tag: WA_NODE_TAGS.VALUE,
                        attrs: {},
                        content: toBytesView(record.keyPair.pubKey)
                    }
                ]
            }))
        },
        {
            tag: WA_NODE_TAGS.SKEY,
            attrs: {},
            content: [
                {
                    tag: WA_NODE_TAGS.ID,
                    attrs: {},
                    content: intToBytes(3, signedPreKey.keyId)
                },
                {
                    tag: WA_NODE_TAGS.VALUE,
                    attrs: {},
                    content: toBytesView(signedPreKey.keyPair.pubKey)
                },
                {
                    tag: WA_NODE_TAGS.SIGNATURE,
                    attrs: {},
                    content: toBytesView(signedPreKey.signature)
                }
            ]
        }
    ])
}
