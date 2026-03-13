export function readPositiveLimit(envName: string, fallback: number): number {
    const raw = process.env[envName]
    if (!raw) {
        return fallback
    }
    const parsed = Number(raw)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}
