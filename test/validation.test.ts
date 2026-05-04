/**
 * MiniMax Music MCP Server
 * Tests for input validation schemas.
 */

import {
  validateGenerateMusic,
  validateGenerateInstrumental,
  validateGenerateCover,
} from "../src/schemas.js";

describe("generate_music validation", () => {
  it("accepts valid minimal input with lyrics", () => {
    const result = validateGenerateMusic({ lyrics: "hello world" });
    expect(result.valid).toBe(true);
  });

  it("defaults omitted model to music-2.6-free", () => {
    const result = validateGenerateMusic({ lyrics: "hello world" });
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error(result.error);
    expect(result.value.model).toBe("music-2.6-free");
  });

  it("accepts lyrics_optimizer with prompt but no lyrics", () => {
    const result = validateGenerateMusic({ prompt: "a fun song", lyrics_optimizer: true });
    expect(result.valid).toBe(true);
  });

  it("rejects missing lyrics when lyrics_optimizer is false", () => {
    const result = validateGenerateMusic({});
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("lyrics");
  });

  it("rejects lyrics over 3500 chars", () => {
    const result = validateGenerateMusic({ lyrics: "a".repeat(3501) });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("3500");
  });

  it("rejects prompt over 2000 chars", () => {
    const result = validateGenerateMusic({ prompt: "a".repeat(2001), lyrics: "hello" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("2000");
  });

  it("rejects stream because streaming is deferred", () => {
    const result = validateGenerateMusic({ lyrics: "hello", stream: true });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("stream");
  });

  it("rejects url output because URL handling is deferred", () => {
    const result = validateGenerateMusic({ lyrics: "hello", stream: true, output_format: "url" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("output_format: url");
  });

  it("accepts valid audio_setting", () => {
    const result = validateGenerateMusic({
      lyrics: "hello",
      audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid sample_rate", () => {
    const result = validateGenerateMusic({ lyrics: "hello", audio_setting: { sample_rate: 48000 } });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("sample_rate");
  });

  it("rejects invalid format", () => {
    const result = validateGenerateMusic({ lyrics: "hello", audio_setting: { format: "flac" } });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("format");
  });

  it("accepts model music-2.6-free", () => {
    const result = validateGenerateMusic({ lyrics: "hello", model: "music-2.6-free" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid model", () => {
    const result = validateGenerateMusic({ lyrics: "hello", model: "music-3.0" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("model");
  });
});

describe("generate_instrumental validation", () => {
  it("accepts valid prompt", () => {
    const result = validateGenerateInstrumental({ prompt: "peaceful piano" });
    expect(result.valid).toBe(true);
  });

  it("defaults omitted model to music-2.6-free", () => {
    const result = validateGenerateInstrumental({ prompt: "peaceful piano" });
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error(result.error);
    expect(result.value.model).toBe("music-2.6-free");
  });

  it("rejects missing prompt", () => {
    const result = validateGenerateInstrumental({});
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("prompt");
  });

  it("rejects prompt over 2000 chars", () => {
    const result = validateGenerateInstrumental({ prompt: "a".repeat(2001) });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("2000");
  });

  it("rejects stream because streaming is deferred", () => {
    const result = validateGenerateInstrumental({ prompt: "piano", stream: true, output_format: "hex" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("stream");
  });

  it("rejects url output because URL handling is deferred", () => {
    const result = validateGenerateInstrumental({ prompt: "piano", output_format: "url" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("output_format: url");
  });
});

describe("generate_cover validation", () => {
  it("accepts valid input with audio_url", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat", audio_url: "https://example.com/audio.mp3" });
    expect(result.valid).toBe(true);
  });

  it("defaults omitted model to music-cover-free", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat", audio_url: "https://example.com/audio.mp3" });
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error(result.error);
    expect(result.value.model).toBe("music-cover-free");
  });

  it("accepts valid input with audio_base64", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat", audio_base64: "SU4zIQ==" });
    expect(result.valid).toBe(true);
  });

  it("accepts valid input with cover_feature_id + lyrics", () => {
    const result = validateGenerateCover({
      prompt: "make it upbeat",
      cover_feature_id: "abc123",
      lyrics: "la la la la la la",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing prompt", () => {
    const result = validateGenerateCover({ audio_url: "https://example.com/audio.mp3" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("prompt");
  });

  it("rejects prompt under 10 chars", () => {
    const result = validateGenerateCover({ prompt: "short", audio_url: "https://example.com/audio.mp3" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("10");
  });

  it("rejects prompt over 300 chars", () => {
    const result = validateGenerateCover({ prompt: "a".repeat(301), audio_url: "https://example.com/audio.mp3" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("300");
  });

  it("rejects when no reference audio source is provided", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("audio_url");
  });

  it("rejects when more than one audio source is provided", () => {
    const result = validateGenerateCover({
      prompt: "make it upbeat",
      audio_url: "https://example.com/audio.mp3",
      audio_base64: "SU4zIQ==",
    });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("Only one");
  });

  it("rejects cover_feature_id without lyrics", () => {
    const result = validateGenerateCover({
      prompt: "make it upbeat",
      cover_feature_id: "abc123",
    });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("lyrics");
  });

  it("rejects lyrics < 10 chars for cover_feature_id", () => {
    const result = validateGenerateCover({
      prompt: "make it upbeat",
      cover_feature_id: "abc123",
      lyrics: "hi",
    });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("10");
  });

  it("accepts optional lyrics with audio_url (10-1000 chars)", () => {
    const result = validateGenerateCover({
      prompt: "make it upbeat",
      audio_url: "https://example.com/audio.mp3",
      lyrics: "hello world lyrics",
    });
    expect(result.valid).toBe(true);
  });

  it("accepts model music-cover-free", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat", audio_url: "https://example.com/audio.mp3", model: "music-cover-free" });
    expect(result.valid).toBe(true);
  });

  it("rejects stream because streaming is deferred", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat", audio_url: "https://example.com/audio.mp3", stream: true });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("stream");
  });

  it("rejects url output because URL handling is deferred", () => {
    const result = validateGenerateCover({ prompt: "make it upbeat", audio_url: "https://example.com/audio.mp3", output_format: "url" });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toContain("output_format: url");
  });
});
