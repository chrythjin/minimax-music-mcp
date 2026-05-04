/**
 * MiniMax Music MCP Server
 * Tests for audio hex to file conversion.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { saveAudioFromHex, hexToBuffer, isValidAudioFile } from "../src/audio-output.js";

// Module-level fixture — 100 bytes of valid hex (JPEG SOI + JFIF data)
const FIXTURE_HEX = "ffd8ffe000104a46494600010100000100010000fffe004300490046200100010001000101011101010101010100000000000000000001000101010100020101010303020203000000000000000000010203040506070809101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a".slice(0, 200);

describe("hexToBuffer", () => {
  it("converts valid hex string to buffer", () => {
    const buf = hexToBuffer("48454c4c4f"); // "HELLO"
    expect(buf.toString("utf8")).toBe("HELLO");
  });

  it("handles empty hex string", () => {
    const buf = hexToBuffer("");
    expect(buf.length).toBe(0);
  });

  it("throws on invalid hex characters", () => {
    expect(() => hexToBuffer("48454c4c4g")).toThrow("Invalid hex");
  });

  it("throws on odd-length hex string", () => {
    expect(() => hexToBuffer("48454c4c4")).toThrow("even");
  });
});

describe("saveAudioFromHex", () => {
  it("saves hex to file and returns metadata", () => {
    const result = saveAudioFromHex(FIXTURE_HEX, { tool: "generate_music" });
    expect(result.file_path).toBeDefined();
    expect(result.format).toBe("mp3"); // default
    expect(result.size_bytes).toBeGreaterThan(0);
    expect(fs.existsSync(result.file_path)).toBe(true);
  });

  it("uses format from audio_setting", () => {
    const result = saveAudioFromHex(FIXTURE_HEX, {
      tool: "generate_music",
      audioSetting: { format: "wav" },
    });
    expect(result.format).toBe("wav");
    expect(result.file_path).toContain(".wav");
  });

  it("creates file with correct name pattern YYYYMMDD_HHMMSS_tool.format", () => {
    const result = saveAudioFromHex(FIXTURE_HEX, { tool: "generate_instrumental" });
    const fileName = path.basename(result.file_path);
    expect(fileName).toMatch(/^\d{8}_\d{6}_generate_instrumental\.mp3$/);
  });

  it("throws on empty hex", () => {
    expect(() => saveAudioFromHex("", { tool: "generate_music" })).toThrow("empty");
  });

  it("file is non-empty and readable", () => {
    const result = saveAudioFromHex(FIXTURE_HEX, { tool: "generate_music" });
    const content = fs.readFileSync(result.file_path);
    expect(content.length).toBe(result.size_bytes);
  });
});

describe("isValidAudioFile", () => {
  it("returns true for existing non-empty file", () => {
    const result = saveAudioFromHex(FIXTURE_HEX, { tool: "generate_music" });
    expect(isValidAudioFile(result.file_path)).toBe(true);
  });

  it("returns false for non-existent path", () => {
    expect(isValidAudioFile("C:\\none\\none\\none.mp3")).toBe(false);
  });
});