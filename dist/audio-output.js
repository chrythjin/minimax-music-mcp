"use strict";
/**
 * MiniMax Music MCP Server
 * Audio output utilities: hex string to binary file saved in %TEMP%\minimax-music\
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToBuffer = hexToBuffer;
exports.saveAudioFromHex = saveAudioFromHex;
exports.isValidAudioFile = isValidAudioFile;
exports.listAudioFiles = listAudioFiles;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------
function getTempDir() {
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
function buildFileName(tool, format) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
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
function hexToBuffer(hex) {
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
function saveAudioFromHex(hex, options) {
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
function isValidAudioFile(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return stat.size > 0;
    }
    catch {
        return false;
    }
}
/**
 * Lists all audio files in the temp directory, sorted newest first.
 */
function listAudioFiles() {
    const dir = getTempDir();
    return fs
        .readdirSync(dir)
        .filter((f) => /\.(mp3|wav|pcm)$/.test(f))
        .sort()
        .reverse()
        .map((f) => path.join(dir, f));
}
