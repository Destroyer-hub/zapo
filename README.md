# wha.ts

A high-performance TypeScript implementation of the WhatsApp Web protocol.

## Stability Notice

This project is currently pre-`1.0.0`.

Until the first major release is published, frequent breaking changes are expected, including API and behavior changes between releases.
If you depend on `wha.ts` in long-lived environments, pin exact versions and validate upgrades carefully.

## Independent by Design

`wha.ts` is not based on any existing WhatsApp library.

- No wrappers around third-party WhatsApp SDKs
- No forks of existing WhatsApp client libraries
- No copied protocol abstractions from community libraries

The protocol source of truth is the deobfuscated WhatsApp Web. The goal is parity with WhatsApp Web behavior, while still improving internal performance and memory usage.

## Core Project Principles

These principles come directly from `AGENTS.md` and drive all implementation decisions:

- `index-first`: validate protocol behavior against Whatsapp Web before implementing anything
- `performance-first`: optimize for low CPU, low RAM, low allocations, and zero-copy in hot paths
- `async-first`: I/O, network, and crypto operations are async

## Architecture Patterns

The project follows a few strict patterns:

- Coordinator-first feature design in `src/client/coordinators/`
- Pure node builders in `src/transport/node/builders/` for reusable protocol stanzas
- Incoming parsers/normalizers in `src/client/events/`, with coordinators orchestrating only flow
- Typed store contracts in `src/store/contracts/` with `memory` and `sqlite` providers
- Protocol constants in `src/protocol/` using `Object.freeze({...} as const)`

## Engineering Conventions

- `Uint8Array` everywhere for binary data (`Buffer` is avoided)
- Zero-copy (`subarray`, byte views) in critical paths
- Bounded in-memory structures to prevent unbounded growth
- Path aliases (`@client`, `@crypto`, `@store`, etc.), no relative `../` imports
- Named exports only, no default exports
- No enums (`Object.freeze` + `as const` instead)

## Requirements

- Node.js `>= 20.9.0`
- npm

Runtime dependencies:

- Only **one mandatory dependency**: `protobufjs`

Optional peer dependencies:

- `better-sqlite3` for SQLite-backed stores
- `pino` and `pino-pretty` for structured logging

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run the real flow example:

```bash
npm run example
```

3. Scan the QR code printed by the `auth_qr` event.

4. Send `ping` to your connected session. The example listens for incoming messages and replies with `pong`.

The example persists auth state in `.auth/state.sqlite`.

## Minimal Usage

```ts
import { createPinoLogger, createStore, WaClient } from 'wha.ts'

const logger = await createPinoLogger({
    level: 'info',
    pretty: true
})

const store = createStore({
    sqlite: {
        path: '.auth/state.sqlite',
        driver: 'auto'
    },
    providers: {
        messages: 'sqlite',
        threads: 'sqlite',
        contacts: 'sqlite'
    }
})

const client = new WaClient(
    {
        store,
        sessionId: 'default',
        connectTimeoutMs: 15_000,
        nodeQueryTimeoutMs: 30_000,
        history: {
            enabled: true,
            requireFullSync: true
        }
    },
    logger
)

client.on('auth_qr', ({ qr, ttlMs }) => {
    console.log('qr', { qr, ttlMs })
})

client.on('message', (event) => {
    console.log('incoming', {
        chatJid: event.chatJid,
        senderJid: event.senderJid
    })
})

await client.connect()
```

## Useful Scripts

- `npm run build` - Build CJS, ESM, and types
- `npm run test` - Run unit tests (non-flow)
- `npm run test:flow` - Run real flow tests
- `npm run test:coverage` - Run coverage report
- `npm run typecheck` - Type-check project
- `npm run lint` - Lint source files
- `npm run format` - Format codebase
- `npm run proto:generate` - Regenerate protobuf runtime/types from `proto/WAProto.proto`
- `npm run changeset` - Create a versioning entry (patch/minor/major)
- `npm run changeset:status` - Show pending versioning entries
- `npm run version:packages` - Apply pending versions and update changelog
- `npm run release:publish` - Build and publish to npm with Changesets

## Versioning and Releases

This project now uses [Changesets](https://github.com/changesets/changesets) for semantic versioning and changelog generation.

Release flow:

1. Add a changeset after a change:

```bash
npm run changeset
```

2. Review pending version impact:

```bash
npm run changeset:status
```

3. Generate next package version and `CHANGELOG.md`:

```bash
npm run version:packages
```

4. Publish:

```bash
npm run release:publish
```

Notes:

- Changesets are stored in `.changeset/*.md`
- Multiple changesets are merged automatically into the next release
- Keep using SemVer (`patch`, `minor`, `major`) based on real API impact

## GitHub Release Notes (Changes + Contributors)

A GitHub Action now creates release notes automatically (including merged changes and contributors) when a version tag is pushed.

- Workflow file: `.github/workflows/github-release.yml`
- Release notes config (categories/labels): `.github/release.yml`

Trigger:

```bash
git tag v0.1.1
git push origin v0.1.1
```

The release page is generated with:

- grouped PR changes (by labels)
- automatic contributor list
- prerelease flag when tag includes `-` (example: `v0.2.0-rc.1`)

## Protobuf Generation

`npm run proto:generate` runs `scripts/generate-proto.cjs`, which:

- Ensures proto tooling dependencies are installed in `proto/`
- Generates and minifies `proto/index.js`
- Regenerates compact typings at `proto/index.d.ts`

## Contribution Notes

Before opening a PR, use this checklist:

- Validate behavior against Whatsapp Web
- Keep performance/memory constraints in mind
- Keep protocol node building/parsing organized by project patterns
- Avoid API changes that diverge from observed WhatsApp Web behavior
- Test in real flows when touching auth, transport, app state, retry, or signal paths

## Disclaimer

This project is an independent implementation for engineering and interoperability research. It is not affiliated with or endorsed by WhatsApp.
