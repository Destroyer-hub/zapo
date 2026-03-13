export const WA_BROWSERS = Object.freeze({
    CHROME: 'chrome',
    CHROMIUM: 'chromium',
    FIREFOX: 'firefox',
    SAFARI: 'safari',
    IE: 'ie',
    OPERA: 'opera',
    EDGE: 'edge'
} as const)

export const WA_COMPANION_PLATFORM_IDS = Object.freeze({
    UNKNOWN: '0',
    CHROME: '1',
    EDGE: '2',
    FIREFOX: '3',
    IE: '4',
    OPERA: '5',
    SAFARI: '6',
    ELECTRON: '7',
    UWP: '8',
    OTHER_WEB_CLIENT: '9'
} as const)

export function getWaCompanionPlatformId(browser: string): string {
    const normalized = browser.trim().toLowerCase()
    switch (normalized) {
        case WA_BROWSERS.CHROME:
            return WA_COMPANION_PLATFORM_IDS.CHROME
        case WA_BROWSERS.FIREFOX:
            return WA_COMPANION_PLATFORM_IDS.FIREFOX
        case WA_BROWSERS.IE:
            return WA_COMPANION_PLATFORM_IDS.IE
        case WA_BROWSERS.OPERA:
            return WA_COMPANION_PLATFORM_IDS.OPERA
        case WA_BROWSERS.SAFARI:
            return WA_COMPANION_PLATFORM_IDS.SAFARI
        case WA_BROWSERS.EDGE:
            return WA_COMPANION_PLATFORM_IDS.EDGE
        case WA_BROWSERS.CHROMIUM:
        default:
            return WA_COMPANION_PLATFORM_IDS.OTHER_WEB_CLIENT
    }
}
