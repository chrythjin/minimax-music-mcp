/**
 * MiniMax Music MCP Server
 * MiniMax API client — handles API key, HTTP POST, response parsing, error mapping.
 */

import { env } from "node:process";
import {
  MinMaxApiError,
  MinMaxNetworkError,
  MinMaxParseError,
  MissingApiKeyError,
} from "./errors.js";
import { saveAudioFromHex, type AudioSetting } from "./audio-output.js";
import type { GenerateMusicInput } from "./schemas.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const API_ENDPOINT = "https://api.minimax.io/v1/music_generation";

/** Raw API request body sent to MiniMax */
interface MusicGenerationOptions {
  model?: string;
  prompt?: string;
  lyrics?: string;
  lyrics_optimizer?: boolean;
  is_instrumental?: boolean;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
  audio_url?: string;
  audio_base64?: string;
  cover_feature_id?: string;
}

type MusicToolName = "generate_music" | "generate_instrumental" | "generate_cover";

/** Parsed top-level response */
interface MinMaxResponse {
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  data?: {
    status: 1 | 2;
    audio?: string; // hex or URL depending on output_format
  };
  trace_id?: string;
  extra_info?: {
    music_duration?: number;
    music_sample_rate?: number;
    music_channel?: number;
    bitrate?: number;
    music_size?: number;
  };
}

/** Result returned to callers */
export interface GenerationResult {
  file_path?: string;
  format: string;
  duration_ms?: number;
  sample_rate?: number;
  bitrate?: number;
  size_bytes?: number;
  trace_id?: string;
  status: string;
}

// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = env.MINIMAX_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new MissingApiKeyError();
  }
  return key;
}

// ---------------------------------------------------------------------------
// Fetch with error handling
// ---------------------------------------------------------------------------

async function apiFetch(
  body: MusicGenerationOptions
): Promise<MinMaxResponse> {
  const key = getApiKey();

  let response: Response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new MinMaxNetworkError(
      `Network error reaching ${API_ENDPOINT}`,
      err
    );
  }

  if (!response.ok) {
    throw new MinMaxNetworkError(
      `MiniMax API returned HTTP ${response.status}: ${response.statusText}`,
      response.status
    );
  }

  let parsed: MinMaxResponse;
  try {
    parsed = (await response.json()) as MinMaxResponse;
  } catch (err) {
    throw new MinMaxParseError(err);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Core generation logic (called by tools.ts)
// ---------------------------------------------------------------------------

export async function generateMusicFromAPI(
  options: MusicGenerationOptions,
  toolName: MusicToolName = "generate_music"
): Promise<GenerationResult> {
  if (options.output_format === "url") {
    throw new MinMaxParseError(
      new Error("output_format: url is deferred until MiniMax URL response samples are confirmed.")
    );
  }

  const resp = await apiFetch(options);

  // Check MiniMax-level error
  if (resp.base_resp.status_code !== 0) {
    throw new MinMaxApiError(resp.base_resp.status_code);
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
    throw new MinMaxParseError(new Error("MiniMax response data.status must be 1 or 2."));
  }

  const hex = resp.data.audio;
  if (!hex) {
    throw new MinMaxParseError(new Error("data.audio is missing in hex response."));
  }

  const saved = saveAudioFromHex(hex, {
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

export async function callGenerateMusic(
  input: GenerateMusicInput
): Promise<GenerationResult> {
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

export async function callGenerateInstrumental(
  prompt: string,
  model: string | undefined,
  outputFormat: "hex" | "url" | undefined,
  stream: boolean | undefined,
  audioSetting: AudioSetting | undefined
): Promise<GenerationResult> {
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

export async function callGenerateCover(
  prompt: string,
  model: string | undefined,
  lyrics: string | undefined,
  audioUrl: string | undefined,
  audioBase64: string | undefined,
  coverFeatureId: string | undefined,
  outputFormat: "hex" | "url" | undefined,
  stream: boolean | undefined,
  audioSetting: AudioSetting | undefined
): Promise<GenerationResult> {
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
