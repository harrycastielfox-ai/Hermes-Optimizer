# Hermes Optimizer

Hermes Optimizer is a professional Windows optimization app foundation built with Tauri, React, TypeScript, Rust, TailwindCSS, and Vite.

## Safety scope for this initial base

This repository intentionally ships with simulated data and simulated backend commands only. It does not change the Windows registry, disable services, disable Defender, alter Firewall or Windows Update, remove personal files, change drivers, collect telemetry, implement licensing, or perform destructive cleanup.

All future real actions must pass through Rust/Tauri backend commands with confirmation, transparent logs, risk labels, and rollback planning.

## Install dependencies

```bash
npm install
```

## Run web UI in development

```bash
npm run dev
```

## Run Tauri in development

```bash
npm run tauri dev
```

## Build frontend

```bash
npm run build
```

## Current mocked areas

- Dashboard metrics and system overview.
- Diagnostics cards.
- Cleaner scan categories and cleanup execution.
- Startup application list.
- Hermes Tweak Engine catalog and application flow.
- Performance profile application.
- Gamer mode executable selection and restore flow.
- Restore snapshots and restore flow.
- Optimization logs.
- Settings persistence.

## Recommended next steps

1. Add a safe frontend service layer around Tauri `invoke` calls with typed DTO mapping.
2. Add persistent local settings and log storage.
3. Implement real read-only diagnostics first, before any write operation.
4. Design a signed action manifest for every future optimization.
5. Add automated tests for safety rules, confirmation requirements, and DTO contracts.

## Frontend → Hermes API → Tauri/Rust flow

The React UI must call `src/lib/tauri/hermesApi.ts` instead of importing mock data directly for engine-backed features. `hermesApi.ts` exposes typed product functions and delegates to `invokeSafe.ts`, which is the guarded gateway to Tauri `invoke`.

`invokeSafe.ts` detects whether the app is running inside Tauri. When the UI is opened with plain `npm run dev` in a browser, Tauri is not available, so the API automatically returns safe mock data with `fallback: true`. If a Tauri command fails, the same safe fallback path is used with a friendly error message so screens do not crash.

This layer is the only intended bridge between UI and the Hermes engine. Future real actions must pass through backend validation, explicit user confirmation, logging, risk disclosure and rollback planning. The frontend must never execute direct operating-system commands.
