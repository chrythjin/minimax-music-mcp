# MiniMax Music MCP Server

Model Context Protocol (MCP) server for MiniMax Music Generation API. Enables AI agents to generate music and audio content through the MiniMax API via the MCP protocol.

> **Status:** Planning — implementation not started yet

## What This Does

Provides `generate_music`, `generate_instrumental`, and `generate_cover` tools that wrap the MiniMax Music Generation API (`POST https://api.minimax.io/v1/music_generation`). Agents can call these tools natively via MCP without managing API calls directly.

## Why This Exists

OpenCode skills are instruction documents only — they cannot make HTTP calls or process binary audio data. This MCP server bridges that gap by:

- Making authenticated calls to the MiniMax API
- Converting hex-encoded audio responses to binary files
- Returning file paths to agents in a structured format

## Features

- **Direct MiniMax API** — uses `api.minimax.io`, not third-party gateways
- **3 tool types** — `generate_music`, `generate_instrumental`, `generate_cover`
- **Hex → File conversion** — converts `output_format: hex` responses to playable audio files
- **Input validation** — model-specific rules for prompt, lyrics, reference audio
- **Error mapping** — MiniMax status codes mapped to human-readable MCP errors

## Documentation

- [Implementation Plan (Official API Reference)](./minimax-music-mcp-official-plan.md) — authoritative implementation plan based on `https://platform.minimax.io/docs/api-reference/music-generation`
- [Review Report](./minimax-music-mcp-review.md) — analysis of skill-only vs MCP server approach
- [Original Plan](./minimax-music-mcp-plan.md) — initial Sisyphus plan (superseded by official-plan.md)

## Quick Look: MiniMax Music API

```
POST https://api.minimax.io/v1/music_generation
Authorization: Bearer <MINIMAX_API_KEY>
```

### Models

| Model | Use case | Access |
|-------|----------|--------|
| `music-2.6` | Text-to-music | Token Plan / paid users |
| `music-2.6-free` | Text-to-music free tier | API Key users |
| `music-cover` | Cover from reference audio | Token Plan / paid users |
| `music-cover-free` | Cover from reference audio free tier | API Key users |

### Tool Summary

| Tool | Model | Purpose |
|------|-------|---------|
| `generate_music` | `music-2.6` / `music-2.6-free` | Vocal music with prompt + lyrics |
| `generate_instrumental` | `music-2.6` / `music-2.6-free` | Instrumental only, no vocals |
| `generate_cover` | `music-cover` / `music-cover-free` | Cover based on reference audio |

## Status

| Item | Status |
|------|--------|
| Documentation | ✅ Complete |
| Implementation | ❌ Not started |
| OpenCode registration | ❌ Not done |

## License

MIT
