"use strict";
/**
 * MiniMax Music MCP Server
 * MCP entrypoint — stdio transport, tool registration, request routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const errors_js_1 = require("./errors.js");
const tools_js_1 = require("./tools.js");
// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------
function createServer() {
    return new index_js_1.Server({ name: "minimax-music-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
}
// ---------------------------------------------------------------------------
// API key guard
// ---------------------------------------------------------------------------
function assertApiKey() {
    if (!process.env.MINIMAX_API_KEY) {
        throw new errors_js_1.MissingApiKeyError();
    }
}
// ---------------------------------------------------------------------------
// Request handlers
// ---------------------------------------------------------------------------
function setupHandlers(server) {
    // ── tools/list ──────────────────────────────────────────────────────────
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
        tools: (0, tools_js_1.listTools)(),
    }));
    // ── tools/call ──────────────────────────────────────────────────────────
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        // Guard API key on every call
        try {
            assertApiKey();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: msg }],
                isError: true,
            };
        }
        const { name, arguments: args } = request.params;
        try {
            let result;
            switch (name) {
                case "generate_music":
                    result = await (0, tools_js_1.generateMusic)(args);
                    break;
                case "generate_instrumental":
                    result = await (0, tools_js_1.generateInstrumental)(args);
                    break;
                case "generate_cover":
                    result = await (0, tools_js_1.generateCover)(args);
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
        }
        catch (err) {
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
async function main() {
    const server = createServer();
    setupHandlers(server);
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    // Use console.error for server-side logs (stdio multiplexes stdout/stderr)
    console.error("minimax-music-mcp: fatal startup error:", error);
    process.exit(1);
});
