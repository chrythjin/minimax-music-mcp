# AGENTS.md — MiniMax Music MCP Server

## Project Status

**Implementation in progress** — source code lives under `src/`, build output in `dist/`.

## What This Repo Is

Node.js stdio MCP server wrapping MiniMax Music Generation API (`POST https://api.minimax.io/v1/music_generation`). Provides `generate_music`, `generate_instrumental`, `generate_cover` as native MCP tools.

## Quick Start

```bash
npm install
npm run build        # → dist/index.js
npm run test
```

## Structure

```
minimax-music-mcp/
├── src/
│   ├── index.ts          # MCP server entry point (stdio)
│   ├── minimax-client.ts # MiniMax API calls
│   ├── schemas.ts        # Tool input/output schemas
│   ├── tools.ts          # MCP tool definitions
│   ├── audio-output.ts   # hex → binary file conversion
│   └── errors.ts         # Error code mapping
└── test/
    ├── validation.test.ts
    ├── audio-output.test.ts
    └── minimax-client.test.ts
```

## Commands

| Command | What |
|---------|------|
| `npm run build` | Compile TypeScript → `dist/index.js` |
| `npm run watch` | Watch mode for development |
| `npm run test` | Run Jest unit tests |

## Key Constraints

- `MINIMAX_API_KEY` env var must be set — never put key in config
- `stream: true` → `output_format: hex` only (URL not supported in streaming)
- `generate_music` without `lyrics_optimizer: true` → `lyrics` mandatory (1–3500 chars)
- `generate_cover` audio sources (`audio_url` / `audio_base64` / `cover_feature_id`) are mutually exclusive

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

## Audio Output

- Hex responses → `%TEMP%\minimax-music\YYYYMMDD_HHMMSS_<tool>.<format>`
- Format from `audio_setting.format`: `mp3` | `wav` | `pcm`
- File name pattern: `YYYYMMDD_HHMMSS_<tool>.<format>`

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | Success | — |
| `1002` | Rate limit | Retry later |
| `1004` | Auth failed | Check API key |
| `1008` | Insufficient balance | Check account |
| `1026` | Sensitive content | Modify prompt/lyrics |
| `2013` | Invalid parameters | Fix input |
| `2049` | Invalid API key | Verify key |

Also check `data.status`: `1` = in progress, `2` = complete.

## Deferred Items

- `stream: true` chunk format — not documented in OpenAPI; need real response sample
- `output_format: url` response field — docs are hex-focused
- OpenCode `mcp` block `env` field support — unknown, may need PowerShell wrapper

## Reference Docs

- `minimax-music-mcp-official-plan.md` — authoritative API reference
- `minimax-music-mcp-execution-plan.md` — wave-based implementation plan
- `minimax-music-mcp-review.md` — why MCP server (not skill-only)
- `minimax-music-mcp-plan.md` — superseded, do not use