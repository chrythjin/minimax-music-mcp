/**
 * MiniMax Music MCP Server
 * Input validation schemas for generate_music, generate_instrumental, generate_cover
 */

import type { AudioSetting } from "./audio-output.js";
export type { AudioSetting };

// ---------------------------------------------------------------------------
// Audio setting constraints
// ---------------------------------------------------------------------------

export const VALID_SAMPLE_RATES = [16000, 24000, 32000, 44100] as const;
export const VALID_BITRATES = [32000, 64000, 128000, 256000] as const;
export const VALID_FORMATS = ["mp3", "wav", "pcm"] as const;

export type SampleRate = (typeof VALID_SAMPLE_RATES)[number];
export type Bitrate = (typeof VALID_BITRATES)[number];
export type AudioFormat = (typeof VALID_FORMATS)[number];

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface GenerateMusicInput {
  model?: "music-2.6" | "music-2.6-free";
  prompt?: string;
  lyrics?: string;
  lyrics_optimizer?: boolean;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
}

export interface GenerateInstrumentalInput {
  model?: "music-2.6" | "music-2.6-free";
  prompt: string;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
}

export interface GenerateCoverInput {
  model?: "music-cover" | "music-cover-free";
  prompt: string;
  lyrics?: string;
  audio_url?: string;
  audio_base64?: string;
  cover_feature_id?: string;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_PROMPT_LENGTH = 2000;
const MAX_LYRICS_LENGTH = 3500;
const MIN_COVER_PROMPT_LENGTH = 10;
const MAX_COVER_PROMPT_LENGTH = 300;
const MIN_LYRICS_WITH_COVER = 10;
const MAX_LYRICS_WITH_COVER = 1000;

const STREAM_DEFERRED_ERROR =
  "stream: true is deferred until MiniMax streaming chunk format is confirmed.";
const URL_OUTPUT_DEFERRED_ERROR =
  "output_format: url is deferred until MiniMax URL response samples are confirmed. Use output_format: hex.";

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function maxLength(val: unknown, max: number): boolean {
  return typeof val === "string" && val.length <= max;
}

/**
 * Validates audio_setting fields.
 */
export function validateAudioSetting(input: unknown): {
  valid: boolean;
  error?: string;
} {
  if (input === undefined) return { valid: true };
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "audio_setting must be an object when provided." };
  }
  const s = input as Record<string, unknown>;

  if (s.sample_rate !== undefined) {
    if (!VALID_SAMPLE_RATES.includes(s.sample_rate as SampleRate)) {
      return {
        valid: false,
        error: `sample_rate must be one of: ${VALID_SAMPLE_RATES.join(", ")}.`,
      };
    }
  }
  if (s.bitrate !== undefined) {
    if (!VALID_BITRATES.includes(s.bitrate as Bitrate)) {
      return {
        valid: false,
        error: `bitrate must be one of: ${VALID_BITRATES.join(", ")}.`,
      };
    }
  }
  if (s.format !== undefined) {
    if (!VALID_FORMATS.includes(s.format as AudioFormat)) {
      return {
        valid: false,
        error: `format must be one of: ${VALID_FORMATS.join(", ")}.`,
      };
    }
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// generate_music validation
// ---------------------------------------------------------------------------

export function validateGenerateMusic(
  input: unknown
): { valid: true; value: GenerateMusicInput } | { valid: false; error: string } {
  // Must be object
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "Input must be an object." };
  }
  const v = input as Record<string, unknown>;

  if (v.output_format === "url") {
    return { valid: false, error: URL_OUTPUT_DEFERRED_ERROR };
  }

  if (v.stream === true) {
    return { valid: false, error: STREAM_DEFERRED_ERROR };
  }

  // audio_setting
  const audioResult = validateAudioSetting(v.audio_setting);
  if (!audioResult.valid) return { valid: false, error: audioResult.error! };

  // lyrics_optimizer !== true → lyrics required
  const lyricsOptimizer = v.lyrics_optimizer === true;
  const lyrics = v.lyrics as string | undefined;

  if (!lyricsOptimizer && !isNonEmptyString(lyrics)) {
    return {
      valid: false,
      error: "lyrics is required when lyrics_optimizer is not enabled (1–3500 characters).",
    };
  }

  if (isNonEmptyString(lyrics) && !maxLength(lyrics, MAX_LYRICS_LENGTH)) {
    return {
      valid: false,
      error: `lyrics must be at most ${MAX_LYRICS_LENGTH} characters.`,
    };
  }

  // lyrics_optimizer=true + no lyrics → prompt required
  if (lyricsOptimizer && !isNonEmptyString(lyrics) && !isNonEmptyString(v.prompt)) {
    return {
      valid: false,
      error: "prompt is required when lyrics_optimizer is enabled without lyrics.",
    };
  }

  // prompt length check
  if (isNonEmptyString(v.prompt) && !maxLength(v.prompt, MAX_PROMPT_LENGTH)) {
    return {
      valid: false,
      error: `prompt must be at most ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  // model
  if (v.model !== undefined && !["music-2.6", "music-2.6-free"].includes(v.model as string)) {
    return {
      valid: false,
      error: "model must be 'music-2.6' or 'music-2.6-free'.",
    };
  }

  return {
    valid: true,
    value: {
      ...v,
      model: (v.model as GenerateMusicInput["model"] | undefined) ?? "music-2.6-free",
      output_format: (v.output_format as GenerateMusicInput["output_format"] | undefined) ?? "hex",
    } as GenerateMusicInput,
  };
}

// ---------------------------------------------------------------------------
// generate_instrumental validation
// ---------------------------------------------------------------------------

export function validateGenerateInstrumental(
  input: unknown
): { valid: true; value: GenerateInstrumentalInput } | { valid: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "Input must be an object." };
  }
  const v = input as Record<string, unknown>;

  if (v.output_format === "url") {
    return { valid: false, error: URL_OUTPUT_DEFERRED_ERROR };
  }

  if (v.stream === true) {
    return { valid: false, error: STREAM_DEFERRED_ERROR };
  }

  const audioResult = validateAudioSetting(v.audio_setting);
  if (!audioResult.valid) return { valid: false, error: audioResult.error! };

  if (!isNonEmptyString(v.prompt)) {
    return { valid: false, error: "prompt is required (1–2000 characters)." };
  }
  if (!maxLength(v.prompt, MAX_PROMPT_LENGTH)) {
    return {
      valid: false,
      error: `prompt must be at most ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  if (v.model !== undefined && !["music-2.6", "music-2.6-free"].includes(v.model as string)) {
    return {
      valid: false,
      error: "model must be 'music-2.6' or 'music-2.6-free'.",
    };
  }

  return {
    valid: true,
    value: {
      ...v,
      model: (v.model as GenerateInstrumentalInput["model"] | undefined) ?? "music-2.6-free",
      output_format: (v.output_format as GenerateInstrumentalInput["output_format"] | undefined) ?? "hex",
    } as GenerateInstrumentalInput,
  };
}

// ---------------------------------------------------------------------------
// generate_cover validation
// ---------------------------------------------------------------------------

export function validateGenerateCover(
  input: unknown
): { valid: true; value: GenerateCoverInput } | { valid: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "Input must be an object." };
  }
  const v = input as Record<string, unknown>;

  if (v.output_format === "url") {
    return { valid: false, error: URL_OUTPUT_DEFERRED_ERROR };
  }

  if (v.stream === true) {
    return { valid: false, error: STREAM_DEFERRED_ERROR };
  }

  const audioResult = validateAudioSetting(v.audio_setting);
  if (!audioResult.valid) return { valid: false, error: audioResult.error! };

  // prompt required, 10-300 chars
  if (!isNonEmptyString(v.prompt)) {
    return { valid: false, error: "prompt is required (10–300 characters)." };
  }
  if (typeof v.prompt !== "string" || v.prompt.length < MIN_COVER_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `prompt must be at least ${MIN_COVER_PROMPT_LENGTH} characters.`,
    };
  }
  if (!maxLength(v.prompt, MAX_COVER_PROMPT_LENGTH)) {
    return {
      valid: false,
      error: `prompt must be at most ${MAX_COVER_PROMPT_LENGTH} characters.`,
    };
  }

  // Exactly one reference audio source
  const hasAudioUrl = isNonEmptyString(v.audio_url);
  const hasAudioBase64 = isNonEmptyString(v.audio_base64);
  const hasCoverFeatureId = isNonEmptyString(v.cover_feature_id);
  const audioSourceCount = [hasAudioUrl, hasAudioBase64, hasCoverFeatureId].filter(Boolean).length;

  if (audioSourceCount === 0) {
    return {
      valid: false,
      error: "One of audio_url, audio_base64, or cover_feature_id is required.",
    };
  }
  if (audioSourceCount > 1) {
    return {
      valid: false,
      error: "Only one of audio_url, audio_base64, or cover_feature_id may be provided.",
    };
  }

  // cover_feature_id requires lyrics
  if (hasCoverFeatureId) {
    const lyrics = v.lyrics as string | undefined;
    if (!isNonEmptyString(lyrics)) {
      return {
        valid: false,
        error: "lyrics is required when cover_feature_id is provided (10–1000 characters).",
      };
    }
    if (typeof lyrics !== "string" || lyrics.length < MIN_LYRICS_WITH_COVER || lyrics.length > MAX_LYRICS_WITH_COVER) {
      return {
        valid: false,
        error: `lyrics must be ${MIN_LYRICS_WITH_COVER}–${MAX_LYRICS_WITH_COVER} characters when cover_feature_id is provided.`,
      };
    }
  }

  // audio_url or audio_base64: lyrics is optional but if provided must be 10-1000
  if ((hasAudioUrl || hasAudioBase64) && isNonEmptyString(v.lyrics)) {
    const lyrics = v.lyrics as string;
    if (lyrics.length < MIN_LYRICS_WITH_COVER || lyrics.length > MAX_LYRICS_WITH_COVER) {
      return {
        valid: false,
        error: `lyrics must be ${MIN_LYRICS_WITH_COVER}–${MAX_LYRICS_WITH_COVER} characters when provided.`,
      };
    }
  }

  if (v.model !== undefined && !["music-cover", "music-cover-free"].includes(v.model as string)) {
    return {
      valid: false,
      error: "model must be 'music-cover' or 'music-cover-free'.",
    };
  }

  return {
    valid: true,
    value: {
      ...v,
      model: (v.model as GenerateCoverInput["model"] | undefined) ?? "music-cover-free",
      output_format: (v.output_format as GenerateCoverInput["output_format"] | undefined) ?? "hex",
    } as GenerateCoverInput,
  };
}
