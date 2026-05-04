"use strict";
/**
 * MiniMax Music MCP Server
 * MiniMax API client — handles API key, HTTP POST, response parsing, error mapping.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMusicFromAPI = generateMusicFromAPI;
exports.callGenerateMusic = callGenerateMusic;
exports.callGenerateInstrumental = callGenerateInstrumental;
exports.callGenerateCover = callGenerateCover;
const node_process_1 = require("node:process");
const errors_js_1 = require("./errors.js");
const audio_output_js_1 = require("./audio-output.js");
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const API_ENDPOINT = "https://api.minimax.io/v1/music_generation";
// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------
function getApiKey() {
    const key = node_process_1.env.MINIMAX_API_KEY;
    if (!key || key.trim().length === 0) {
        throw new errors_js_1.MissingApiKeyError();
    }
    return key;
}
// ---------------------------------------------------------------------------
// Fetch with error handling
// ---------------------------------------------------------------------------
async function apiFetch(body) {
    const key = getApiKey();
    let response;
    try {
        response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
        });
    }
    catch (err) {
        throw new errors_js_1.MinMaxNetworkError(`Network error reaching ${API_ENDPOINT}`, err);
    }
    if (!response.ok) {
        throw new errors_js_1.MinMaxNetworkError(`MiniMax API returned HTTP ${response.status}: ${response.statusText}`, response.status);
    }
    let parsed;
    try {
        parsed = (await response.json());
    }
    catch (err) {
        throw new errors_js_1.MinMaxParseError(err);
    }
    return parsed;
}
// ---------------------------------------------------------------------------
// Core generation logic (called by tools.ts)
// ---------------------------------------------------------------------------
async function generateMusicFromAPI(options, toolName = "generate_music") {
    if (options.output_format === "url") {
        throw new errors_js_1.MinMaxParseError(new Error("output_format: url is deferred until MiniMax URL response samples are confirmed."));
    }
    const resp = await apiFetch(options);
    // Check MiniMax-level error
    if (resp.base_resp.status_code !== 0) {
        throw new errors_js_1.MinMaxApiError(resp.base_resp.status_code);
    }
    // Handle in-progress
    if (resp.data?.status === 1) {
        return {
            status: "in_progress",
            format: options.audio_setting?.format ?? "mp3",
            trace_id: resp.trace_id,
        };
    }
    // Must be status === 2
    if (resp.data?.status !== 2) {
        throw new errors_js_1.MinMaxParseError(new Error("MiniMax response data.status must be 1 or 2."));
    }
    const hex = resp.data.audio;
    if (!hex) {
        throw new errors_js_1.MinMaxParseError(new Error("data.audio is missing in hex response."));
    }
    const saved = (0, audio_output_js_1.saveAudioFromHex)(hex, {
        tool: toolName,
        audioSetting: options.audio_setting,
    });
    return {
        file_path: saved.file_path,
        format: saved.format,
        size_bytes: saved.size_bytes,
        duration_ms: resp.extra_info?.music_duration,
        sample_rate: resp.extra_info?.music_sample_rate,
        bitrate: resp.extra_info?.bitrate,
        trace_id: resp.trace_id,
        status: "completed",
    };
}
// ---------------------------------------------------------------------------
// Convenience helpers for tool handlers
// ---------------------------------------------------------------------------
async function callGenerateMusic(input) {
    return generateMusicFromAPI({
        model: input.model ?? "music-2.6-free",
        prompt: input.prompt,
        lyrics: input.lyrics,
        lyrics_optimizer: input.lyrics_optimizer,
        output_format: input.output_format,
        stream: input.stream,
        audio_setting: input.audio_setting,
        // is_instrumental is NOT set for vocal music
    }, "generate_music");
}
async function callGenerateInstrumental(prompt, model, outputFormat, stream, audioSetting) {
    return generateMusicFromAPI({
        model: model ?? "music-2.6-free",
        prompt,
        is_instrumental: true,
        output_format: outputFormat,
        stream,
        audio_setting: audioSetting,
        // no lyrics
    }, "generate_instrumental");
}
async function callGenerateCover(prompt, model, lyrics, audioUrl, audioBase64, coverFeatureId, outputFormat, stream, audioSetting) {
    return generateMusicFromAPI({
        model: model ?? "music-cover-free",
        prompt,
        lyrics,
        audio_url: audioUrl,
        audio_base64: audioBase64,
        cover_feature_id: coverFeatureId,
        output_format: outputFormat,
        stream,
        audio_setting: audioSetting,
    }, "generate_cover");
}
