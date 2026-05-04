# MiniMax Music MCP — Implementation Session

**Date:** 2026-05-04
**Session:** ses_20e2355a9ffelPtBx8KBnVXHPO
**Plan:** `.sisyphus/plans/minimax-music-mcp-final-implementation-plan.md`

## What Was Implemented

Full MCP server implementation from Wave 1 through Wave 5.

### Source Files

| File | Description |
|------|-------------|
| `src/errors.ts` | MiniMax status code mapping (0/1002/1004/1008/1026/2013/2049), custom error classes |
| `src/schemas.ts` | Input validation for all 3 tools; `AudioSetting` constraints |
| `src/audio-output.ts` | hex→Buffer→file saving under `%TEMP%\minimax-music\YYYYMMDD_HHMMSS_<tool>.<format>` |
| `src/minimax-client.ts` | API key guard, `fetch` POST to `api.minimax.io`, response parsing, error mapping |
| `src/tools.ts` | `listTools()` + `generateMusic/Instrmental/Cover` handlers |
| `src/index.ts` | MCP stdio server with `ListToolsRequestSchema` + `CallToolRequestSchema` handlers |

### Test Files

| File | Tests |
|------|-------|
| `test/validation.test.ts` | 27 cases — model selection, prompt/lyrics/audio constraints, mutual exclusivity |
| `test/audio-output.test.ts` | 9 cases — hex conversion, file naming, format override, non-empty verification |
| `test/minimax-client.test.ts` | 5 cases — in-progress, completed, API error, HTTP error, missing key |
| `jest.config.ts` | ts-jest + Node ESM config; required for `--experimental-vm-modules` |

## Key Decisions

1. **SDK v1 pattern** — Used `@modelcontextprotocol/sdk` `Server` class with `setRequestHandler` (not the v2 `McpServer`). Widely documented in OSS examples.
2. **API key guard in `index.ts`** — Every `CallToolRequest` triggers `assertApiKey()` so missing key gives a clean error response, not a process crash.
3. **`stream: true + url` → validation error** — Per plan; the 1st wave should reject this at validation, not let it reach the API.
4. **`is_instrumental: true` only sent by `callGenerateInstrumental`** — `generate_music` never sets this flag.
5. **`cover_feature_id` requires lyrics** — Per MiniMax API spec; validated in `validateGenerateCover`.
6. **Test hex fixture** — JPEG SOI/JFIF data used instead of `FF FB 90 00...` to avoid accidental invalid hex rejection.

## Build & Test Results

```
npm run build  →  ✅ 0 errors (tsc)
npm run test   →  ✅ 43 passed, 0 failed
```

## Deferred Items

| Item | Reason |
|------|--------|
| `stream: true` chunk handling | MiniMax's SSE chunk format undocumented; no real response sample |
| `output_format: url` field location | Not confirmed in OpenAPI schema; need real response sample |
| `preprocess_cover` tool | MiniMax Cover Preprocess API spec not fully verified |
| Real API smoke test | Requires user-provided `MINIMAX_API_KEY` with quota |

## OpenCode Registration

```json
"mcp": {
  "minimax-music": {
    "type": "local",
    "command": ["node", "C:\\NEW PRG\\minimax-music-mcp\\dist\\index.js"],
    "enabled": true,
    "timeout": 300000
  }
}
```

**API key:** Set `MINIMAX_API_KEY` environment variable before starting OpenCode. Never put it in any config file.

## New Dependencies Added

- `ts-jest` + `@types/jest` (dev) — TypeScript/ESM test support
- `ts-node` (dev) — Jest config file requires TS parser