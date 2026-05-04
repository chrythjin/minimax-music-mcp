"use strict";
/**
 * MiniMax Music MCP Server
 * Tool implementations — validate inputs, call minimax-client, return structured results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTools = listTools;
exports.generateMusic = generateMusic;
exports.generateInstrumental = generateInstrumental;
exports.generateCover = generateCover;
const schemas_js_1 = require("./schemas.js");
const minimax_client_js_1 = require("./minimax-client.js");
const errors_js_1 = require("./errors.js");
// ---------------------------------------------------------------------------
// Tool definitions (for tools/list)
// ---------------------------------------------------------------------------
function listTools() {
    return [
        {
            name: "generate_music",
            description: "Generate vocal music from text using MiniMax's music-2.6 or music-2.6-free model. " +
                "Requires lyrics unless lyrics_optimizer is enabled. " +
                "Saves hex output to a temp file and returns the file path.",
            inputSchema: {
                type: "object",
                properties: {
                    model: {
                        type: "string",
                        enum: ["music-2.6", "music-2.6-free"],
                        description: "Model variant. Defaults to music-2.6-free. Use music-2.6 for token-plan users.",
                    },
                    prompt: {
                        type: "string",
                        description: "Musical context or description (max 2000 chars). Used as seeds when lyrics_optimizer is on.",
                    },
                    lyrics: {
                        type: "string",
                        description: "Song lyrics (1–3500 chars). Required when lyrics_optimizer is not enabled.",
                    },
                    lyrics_optimizer: {
                        type: "boolean",
                        description: "When true, lyrics are auto-generated from the prompt if lyrics is empty. " +
                            "Default: false.",
                    },
                    output_format: {
                        type: "string",
                        enum: ["hex", "url"],
                        description: "hex (default) saves to temp file. url is deferred until MiniMax URL response samples are confirmed.",
                    },
                    stream: {
                        type: "boolean",
                        description: "Deferred until MiniMax streaming chunk format is confirmed. Use false.",
                    },
                    audio_setting: {
                        type: "object",
                        description: "Audio encoding settings.",
                        properties: {
                            sample_rate: {
                                type: "number",
                                enum: [16000, 24000, 32000, 44100],
                                description: "Audio sample rate in Hz.",
                            },
                            bitrate: {
                                type: "number",
                                enum: [32000, 64000, 128000, 256000],
                                description: "Audio bitrate in bps.",
                            },
                            format: {
                                type: "string",
                                enum: ["mp3", "wav", "pcm"],
                                description: "Audio container format.",
                            },
                        },
                    },
                },
            },
        },
        {
            name: "generate_instrumental",
            description: "Generate instrumental (vocal-free) music using MiniMax's music-2.6 or music-2.6-free model. " +
                "Requires a prompt. No lyrics are used. " +
                "Saves hex output to a temp file and returns the file path.",
            inputSchema: {
                type: "object",
                properties: {
                    model: {
                        type: "string",
                        enum: ["music-2.6", "music-2.6-free"],
                        description: "Model variant. Defaults to music-2.6-free. Use music-2.6 for token-plan users.",
                    },
                    prompt: {
                        type: "string",
                        description: "Musical description or mood (1–2000 chars). Required.",
                    },
                    output_format: {
                        type: "string",
                        enum: ["hex", "url"],
                        description: "hex (default) saves to temp file. url is deferred until MiniMax URL response samples are confirmed.",
                    },
                    stream: {
                        type: "boolean",
                        description: "Deferred until MiniMax streaming chunk format is confirmed. Use false.",
                    },
                    audio_setting: {
                        type: "object",
                        description: "Audio encoding settings.",
                        properties: {
                            sample_rate: {
                                type: "number",
                                enum: [16000, 24000, 32000, 44100],
                                description: "Audio sample rate in Hz.",
                            },
                            bitrate: {
                                type: "number",
                                enum: [32000, 64000, 128000, 256000],
                                description: "Audio bitrate in bps.",
                            },
                            format: {
                                type: "string",
                                enum: ["mp3", "wav", "pcm"],
                                description: "Audio container format.",
                            },
                        },
                    },
                },
                required: ["prompt"],
            },
        },
        {
            name: "generate_cover",
            description: "Generate a cover version of a song using MiniMax's music-cover or music-cover-free model. " +
                "Requires a prompt and exactly one reference audio source (audio_url, audio_base64, or cover_feature_id). " +
                "Saves hex output to a temp file and returns the file path.",
            inputSchema: {
                type: "object",
                properties: {
                    model: {
                        type: "string",
                        enum: ["music-cover", "music-cover-free"],
                        description: "Model variant. Defaults to music-cover-free. Use music-cover for token-plan users.",
                    },
                    prompt: {
                        type: "string",
                        description: "Description of the desired style/interpretation (10–300 chars). Required.",
                    },
                    lyrics: {
                        type: "string",
                        description: "Lyrics to use (10–1000 chars). Required when cover_feature_id is provided. " +
                            "Optional when audio_url or audio_base64 is provided.",
                    },
                    audio_url: {
                        type: "string",
                        description: "URL of reference audio (6s–6min, max 50MB). " +
                            "Mutually exclusive with audio_base64 and cover_feature_id.",
                    },
                    audio_base64: {
                        type: "string",
                        description: "Base64-encoded reference audio. " +
                            "Mutually exclusive with audio_url and cover_feature_id.",
                    },
                    cover_feature_id: {
                        type: "string",
                        description: "Pre-processed cover feature ID from the Cover Preprocess API. " +
                            "Valid 24h. Mutually exclusive with audio_url and audio_base64. " +
                            "Requires lyrics (10–1000 chars) when used.",
                    },
                    output_format: {
                        type: "string",
                        enum: ["hex", "url"],
                        description: "hex (default) saves to temp file. url is deferred until MiniMax URL response samples are confirmed.",
                    },
                    stream: {
                        type: "boolean",
                        description: "Deferred until MiniMax streaming chunk format is confirmed. Use false.",
                    },
                    audio_setting: {
                        type: "object",
                        description: "Audio encoding settings.",
                        properties: {
                            sample_rate: {
                                type: "number",
                                enum: [16000, 24000, 32000, 44100],
                                description: "Audio sample rate in Hz.",
                            },
                            bitrate: {
                                type: "number",
                                enum: [32000, 64000, 128000, 256000],
                                description: "Audio bitrate in bps.",
                            },
                            format: {
                                type: "string",
                                enum: ["mp3", "wav", "pcm"],
                                description: "Audio container format.",
                            },
                        },
                    },
                },
                required: ["prompt"],
            },
        },
    ];
}
// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------
async function generateMusic(args) {
    const validated = (0, schemas_js_1.validateGenerateMusic)(args);
    if (!validated.valid) {
        throw new errors_js_1.ValidationError(validated.error);
    }
    const result = await (0, minimax_client_js_1.callGenerateMusic)(validated.value);
    return result;
}
async function generateInstrumental(args) {
    const validated = (0, schemas_js_1.validateGenerateInstrumental)(args);
    if (!validated.valid) {
        throw new errors_js_1.ValidationError(validated.error);
    }
    const input = validated.value;
    const result = await (0, minimax_client_js_1.callGenerateInstrumental)(input.prompt, input.model, input.output_format, input.stream, input.audio_setting);
    return result;
}
async function generateCover(args) {
    const validated = (0, schemas_js_1.validateGenerateCover)(args);
    if (!validated.valid) {
        throw new errors_js_1.ValidationError(validated.error);
    }
    const input = validated.value;
    const result = await (0, minimax_client_js_1.callGenerateCover)(input.prompt, input.model, input.lyrics, input.audio_url, input.audio_base64, input.cover_feature_id, input.output_format, input.stream, input.audio_setting);
    return result;
}
