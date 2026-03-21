export interface WaDeviceListSnapshot {
    readonly userJid: string
    readonly deviceJids: readonly string[]
    readonly updatedAtMs: number
}

export interface WaDeviceListStore {
    destroy?(): Promise<void>
    upsertUserDevicesBatch(snapshots: readonly WaDeviceListSnapshot[]): Promise<void>
    getUserDevicesBatch(
        userJids: readonly string[],
        nowMs?: number
    ): Promise<readonly (WaDeviceListSnapshot | null)[]>
    deleteUserDevices(userJid: string): Promise<number>
    cleanupExpired(nowMs: number): Promise<number>
    clear(): Promise<void>
}
