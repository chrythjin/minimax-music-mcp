<div align="center">
  <h1>🎵 MiniMax Music MCP Server</h1>
  <p>
    <b>Model Context Protocol (MCP) server for the MiniMax Music Generation API</b>
  </p>
  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18%2B-green.svg?logo=node.js&logoColor=white" alt="Node.js"></a>
    <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://github.com/chrythjin/minimax-music-mcp/actions"><img src="https://img.shields.io/badge/Build-Passing-brightgreen.svg" alt="Build Status"></a>
    <a href="#license"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
  </p>
</div>

<br/>

> **Empower your AI agents** to generate high-quality music and audio content directly through the MiniMax API using the standardized Model Context Protocol (MCP).

## ✨ Features

- **Native MCP Tools**: Exposes `generate_music`, `generate_instrumental`, and `generate_cover` to any compatible AI agent.
- **Direct MiniMax API Integration**: Connects directly to `api.minimax.io` for fast, authenticated processing.
- **Automatic Audio Processing**: Seamlessly converts `hex` responses directly into playable audio files (`mp3`, `wav`, `pcm`).
- **Input Validation**: Enforces strict model-specific rules for prompts, lyrics, and reference audio before requests are sent.
- **Graceful Error Handling**: Maps complex MiniMax status codes to human-readable MCP errors.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- NPM or Yarn
- **MiniMax API Key** ([Get it here](https://platform.minimax.io/))

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/chrythjin/minimax-music-mcp.git
cd minimax-music-mcp
npm install
```

### Build & Test

Compile the TypeScript source and run the validation tests:

```bash
npm run build
npm run test
```

---

## 🛠 Configuration

### OpenCode Setup

To use this server with OpenCode, add the following to your `mcp` configuration block:

```json
"mcp": {
  "minimax-music": {
    "type": "local",
    "command": ["node", "<absolute-path-to-repo>\\dist\\index.js"],
    "enabled": true,
    "timeout": 300000
  }
}
```
*Note: Replace `<absolute-path-to-repo>` with the actual path, e.g., `C:\\NEW PRG\\minimax-music-mcp`.*

### Environment Variables

You must provide your MiniMax API Key via the environment variable `MINIMAX_API_KEY`. 
Ensure this is set globally or injected when OpenCode/your IDE starts up:

```bash
export MINIMAX_API_KEY="your-api-key-here"
```

---

## 📖 Usage & Tools

The server registers three tools for AI agents. By default, these tools are configured to use the **paid `music-2.6` models**.

| Tool | Default Model | Purpose | Requirements |
|---|---|---|---|
| 🎵 `generate_music` | `music-2.6` | Vocal music with prompt + lyrics | Lyrics (unless optimizer is on) |
| 🎸 `generate_instrumental` | `music-2.6` | Instrumental tracks (no vocals) | Prompt only |
| 🎙️ `generate_cover` | `music-cover` | Cover songs based on reference audio | Reference Audio (URL/Base64/ID) |

### Supported Models

| Model | Use Case | Plan Type |
|---|---|---|
| `music-2.6` | Text-to-music | **Paid (Tokens)** |
| `music-2.6-free` | Text-to-music | Free (API Key) |
| `music-cover` | Cover generation | **Paid (Tokens)** |
| `music-cover-free` | Cover generation | Free (API Key) |

*(Agents can override the default models by providing the `model` parameter during tool execution.)*

---

## 🏗️ Architecture & Docs

This MCP server acts as a bridge. While OpenCode skills cannot natively handle binary audio streams, this server:
1. Receives the JSON-RPC tool request from the agent.
2. Formats and dispatches a REST API call to MiniMax.
3. Retrieves the hex-encoded audio payload.
4. Decodes and writes the file locally.
5. Returns the file path directly to the agent.

For detailed architecture and API references:
- [Official API Reference Plan](./docs/reference/minimax-music-mcp-official-plan.md)
- [Review Report](./docs/reference/minimax-music-mcp-review.md)

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
