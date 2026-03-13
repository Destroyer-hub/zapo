import { WA_DEFAULTS } from '@protocol/constants'
import type { SignalAddress } from '@signal/types'

export function signalAddressKey(address: SignalAddress): string {
    const server = address.server ?? WA_DEFAULTS.HOST_DOMAIN
    return `${address.user}|${server}|${address.device}`
}
