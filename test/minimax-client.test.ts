/**
 * MiniMax Music MCP Server
 * Tests for MiniMax API client — mocked fetch responses.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  callGenerateCover,
  callGenerateInstrumental,
  callGenerateMusic,
  generateMusicFromAPI,
} from "../src/minimax-client.js";

function makeMockResponse(response: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    json: () => Promise.resolve(response),
  } as unknown as Response);
}

function getFirstRequestBody(mockFetch: jest.MockedFunction<typeof fetch>): Record<string, unknown> {
  const firstCall = mockFetch.mock.calls[0];
  if (!firstCall) {
    throw new Error("fetch was not called");
  }

  const requestInit = firstCall[1];
  if (!requestInit || typeof requestInit.body !== "string") {
    throw new Error("fetch request body was not a string");
  }

  return JSON.parse(requestInit.body) as Record<string, unknown>;
}

beforeEach(() => {
  process.env.MINIMAX_API_KEY = "test-api-key-for-unit-tests";
});

afterEach(() => {
  delete process.env.MINIMAX_API_KEY;
  jest.restoreAllMocks();
});

describe("generateMusicFromAPI", () => {
  it("returns in_progress when status=1", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse({
      base_resp: { status_code: 0, status_msg: "success" },
      data: { status: 1 },
      trace_id: "trace-123",
    }));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const result = await generateMusicFromAPI({ lyrics: "hello" });
    expect(result.status).toBe("in_progress");
  });

  it("saves hex file and returns metadata on status=2", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse({
      base_resp: { status_code: 0, status_msg: "success" },
      data: {
        status: 2,
        audio: "48454C4C4F", // "HELLO" in hex
      },
      trace_id: "trace-456",
      extra_info: {
        music_duration: 30000,
        music_sample_rate: 44100,
        bitrate: 256000,
        music_size: 12345,
      },
    }));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const result = await generateMusicFromAPI({
      lyrics: "hello world",
      audio_setting: { format: "mp3" },
    });

    expect(result.status).toBe("completed");
    expect(result.file_path).toBeDefined();
    expect(result.format).toBe("mp3");
    expect(result.size_bytes).toBeGreaterThan(0);
    expect(result.trace_id).toBe("trace-456");
    expect(result.duration_ms).toBe(30000);
    expect(result.sample_rate).toBe(44100);
  });

  it("sends default model for generate_music", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse({
      base_resp: { status_code: 0, status_msg: "success" },
      data: { status: 1 },
    }));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    await callGenerateMusic({ lyrics: "hello world" });

    expect(getFirstRequestBody(mockFetch)).toMatchObject({
      model: "music-2.6",
    });
  });

  it("sends default model and uses instrumental tool name for generate_instrumental", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse({
      base_resp: { status_code: 0, status_msg: "success" },
      data: { status: 2, audio: "48454C4C4F" },
    }));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const result = await callGenerateInstrumental(
      "peaceful piano",
      undefined,
      undefined,
      undefined,
      { format: "mp3" }
    );

    expect(getFirstRequestBody(mockFetch)).toMatchObject({
      model: "music-2.6",
      is_instrumental: true,
    });
    expect(result.file_path).toContain("generate_instrumental");
  });

  it("sends default model and uses cover tool name for generate_cover", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse({
      base_resp: { status_code: 0, status_msg: "success" },
      data: { status: 2, audio: "48454C4C4F" },
    }));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const result = await callGenerateCover(
      "make it upbeat",
      undefined,
      undefined,
      "https://example.com/audio.mp3",
      undefined,
      undefined,
      undefined,
      undefined,
      { format: "mp3" }
    );

    expect(getFirstRequestBody(mockFetch)).toMatchObject({
      model: "music-cover",
      audio_url: "https://example.com/audio.mp3",
    });
    expect(result.file_path).toContain("generate_cover");
  });

  it("throws MinMaxApiError on non-zero base_resp", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse({
      base_resp: { status_code: 1004, status_msg: "auth failed" },
    }));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    await expect(generateMusicFromAPI({ lyrics: "hello" })).rejects.toThrow(
      "Authentication failed"
    );
  });

  it("throws on HTTP error status", async () => {
    const mockFetch = jest.fn<typeof fetch>(() => makeMockResponse(null, false));

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    await expect(generateMusicFromAPI({ lyrics: "hello" })).rejects.toThrow("HTTP 500");
  });

  it("throws MissingApiKeyError when env var not set", async () => {
    delete process.env.MINIMAX_API_KEY;
    await expect(generateMusicFromAPI({ lyrics: "hello" })).rejects.toThrow("MINIMAX_API_KEY");
  });
});
