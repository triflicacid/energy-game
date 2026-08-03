# EnergyGame

An energy-sector strategy game.

## Requirements

| Tool    | Tested version |
|---------|----------------|
| Node.js | 25.9.0         |
| pnpm    | 11.1.2         |

## Installation

```powershell
pnpm install
```

## Developer commands

| Command                     | Purpose                                                                                             |
|-----------------------------|-----------------------------------------------------------------------------------------------------|
| `pnpm run dev:client`       | Start the Vite dev server (hot-reload, port 5173)                                                   |
| `pnpm run build:client`     | Type-check, bundle, and copy assets into `dist/web/` (cleans `dist/web` first)                      |
| `pnpm run open:client`      | Preview the last production build in a browser                                                      |
| `pnpm run electron`         | Compile Electron main process and launch the app (requires `build:client` first in production mode) |
| `pnpm run electron:rebuild` | Rebuild native Electron modules after a Node or Electron version change                             |
| `pnpm test`                 | Run all unit tests once with Vitest                                                                 |
| `pnpm run test:watch`       | Run tests in watch mode                                                                             |
| `pnpm run lint`             | Run ESLint across all source files                                                                  |
| `pnpm run clean`            | Delete the entire `dist/` directory                                                                 |
| `pnpm run clean:web`        | Delete only `dist/web/` (used automatically by `build:client`)                                      |

### Typical development workflow

```powershell
# Terminal 1: client hot-reload
pnpm run dev:client

# Terminal 2: tests in watch mode
pnpm run test:watch
```

### Building and running in Electron

```powershell
# 1. Build the web client
pnpm run build:client

# 2. Compile and launch Electron (loads dist/web/index.html)
pnpm run electron
```

During Electron development you can also start the Vite dev server and run
`electron`. `main.ts` loads `http://localhost:5173` when `NODE_ENV=development`.

## Project layout

```
src/          Client application source (TypeScript + Vite)
electron/     Electron main-process source (compiled separately)
static/       Static assets copied into dist/web/static/
plan/         Design documents and implementation roadmap
docs/         Developer notes
dist/         Generated output (not committed)
  web/        Vite client build
  electron/   Compiled Electron main process
```
