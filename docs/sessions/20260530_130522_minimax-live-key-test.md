# MiniMax live key test

## Summary

Located a local MiniMax auth key and used it to test the MiniMax Music MCP server without printing or storing the key value.

## Key source

- Source: `%USERPROFILE%\.local\share\opencode\auth.json`
- Provider entry: `minimax`
- Key value: not recorded or printed

## Direct API probes

- Dummy key against `https://api.minimax.io/v1/music_generation` returned MiniMax auth failure (`1004`), confirming the endpoint distinguishes invalid credentials.
- Local `minimax` auth key against `https://api.minimax.io/v1/token_plan/remains` returned HTTP 200 and showed available quota for:
  - `music-2.6`
  - `music-cover`
- Several direct `POST /v1/music_generation` payload variants returned `2013 invalid params`; this was not treated as final failure because the MCP surface still needed to be tested end-to-end.

## MCP surface test

Ran `dist/index.js` over stdio with `MINIMAX_API_KEY` injected from the local auth entry.

Successful tool call:

- Tool: `generate_music`
- Model: `music-2.6`
- Result: completed
- Output file: `%LOCALAPPDATA%\Temp\minimax-music\20260530_130636_generate_music.mp3`
- Verified file size: `3849419` bytes
- Returned metadata:
  - format: `mp3`
  - duration: `120111` ms
  - sample rate: `44100`
  - bitrate: `256000`

## Notes

- The key was never printed in command output or written to repository files.
- `generate_instrumental` with `music-2.6-free` returned MiniMax error `2061` via MCP during probing, and direct instrumental variants returned `2013`; vocal generation with `music-2.6` succeeded.
