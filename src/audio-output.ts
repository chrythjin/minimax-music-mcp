/**
 * MiniMax Music MCP Server
 * Audio output utilities: hex string to binary file saved in %TEMP%\minimax-music\
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioSetting {
  sample_rate?: 16000 | 24000 | 32000 | 44100;
  bitrate?: 32000 | 64000 | 128000 | 256000;
  format?: "mp3" | "wav" | "pcm";
}

export interface AudioOutputResult {
  file_path: string;
  format: string;
  size_bytes: number;
}

interface SaveOptions {
  tool: string;
  audioSetting?: AudioSetting;
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

function getTempDir(): string {
  const dir = path.join(os.tmpdir(), "minimax-music");
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ---------------------------------------------------------------------------
// File path generation
// ---------------------------------------------------------------------------

function buildFileName(tool: string, format: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}_${tool}.${format}`;
}

// ---------------------------------------------------------------------------
// Hex to binary conversion
// ---------------------------------------------------------------------------

/**
 * Converts a hex string to a Buffer.
 * Expects pairs of hex characters per byte.
 */
export function hexToBuffer(hex: string): Buffer {
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("Invalid hex string: contains non-hex characters.");
  }
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string: length must be even.");
  }
  return Buffer.from(hex, "hex");
}

// ---------------------------------------------------------------------------
// Save audio hex to file
// ---------------------------------------------------------------------------

/**
 * Saves a hex-encoded audio string to a temp file.
 * Returns the absolute file path and metadata.
 */
export function saveAudioFromHex(
  hex: string,
  options: SaveOptions
): AudioOutputResult {
  if (!hex || hex.length === 0) {
    throw new Error("Cannot save empty audio hex.");
  }

  const format = options.audioSetting?.format ?? "mp3";
  const fileName = buildFileName(options.tool, format);
  const dir = getTempDir();
  const filePath = path.join(dir, fileName);

  const buffer = hexToBuffer(hex);
  fs.writeFileSync(filePath, buffer);

  return {
    file_path: filePath,
    format,
    size_bytes: buffer.byteLength,
  };
}

// ---------------------------------------------------------------------------
// Probe helpers (for test / verification)
// ---------------------------------------------------------------------------

/**
 * Returns true if the file exists and is > 0 bytes.
 */
export function isValidAudioFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * Lists all audio files in the temp directory, sorted newest first.
 */
export function listAudioFiles(): string[] {
  const dir = getTempDir();
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(mp3|wav|pcm)$/.test(f))
    .sort()
    .reverse()
    .map((f) => path.join(dir, f));
}