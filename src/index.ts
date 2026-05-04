/**
 * MiniMax Music MCP Server
 * MCP entrypoint — stdio transport, tool registration, request routing.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MissingApiKeyError } from "./errors.js";
import {
  generateMusic,
  generateInstrumental,
  generateCover,
  listTools,
} from "./tools.js";

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

function createServer(): Server {
  return new Server(
    { name: "minimax-music-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
}

// ---------------------------------------------------------------------------
// API key guard
// ---------------------------------------------------------------------------

function assertApiKey(): void {
  if (!process.env.MINIMAX_API_KEY) {
    throw new MissingApiKeyError();
  }
}

// ---------------------------------------------------------------------------
// Request handlers
// ---------------------------------------------------------------------------

function setupHandlers(server: Server): void {
  // ── tools/list ──────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listTools(),
  }));

  // ── tools/call ──────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Guard API key on every call
    try {
      assertApiKey();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: msg }],
        isError: true,
      };
    }

    const { name, arguments: args } = request.params;

    try {
      let result: object;

      switch (name) {
        case "generate_music":
          result = await generateMusic(args);
          break;
        case "generate_instrumental":
          result = await generateInstrumental(args);
          break;
        case "generate_cover":
          result = await generateCover(args);
          break;
        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Return isError so the LLM sees a clean tool-error rather than a raw throw
      return {
        content: [{ type: "text", text: msg }],
        isError: true,
      };
    }
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = createServer();
  setupHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  // Use console.error for server-side logs (stdio multiplexes stdout/stderr)
  console.error("minimax-music-mcp: fatal startup error:", error);
  process.exit(1);
});