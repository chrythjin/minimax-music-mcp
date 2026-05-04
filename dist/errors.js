"use strict";
/**
 * MiniMax Music MCP Server
 * Error code mapping from MiniMax API base_resp.status_code
 * to user-friendly MCP error messages and recommended actions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.MinMaxParseError = exports.MinMaxNetworkError = exports.MinMaxApiError = exports.MissingApiKeyError = exports.MINIMAX_ERROR_CODES = void 0;
exports.getMinMaxError = getMinMaxError;
exports.isRetryableError = isRetryableError;
/** Known MiniMax API error codes */
exports.MINIMAX_ERROR_CODES = {
    SUCCESS: 0,
    RATE_LIMIT: 1002,
    AUTH_FAILED: 1004,
    INSUFFICIENT_BALANCE: 1008,
    SENSITIVE_CONTENT: 1026,
    INVALID_PARAMETERS: 2013,
    INVALID_API_KEY: 2049,
};
const ERROR_MAP = {
    [exports.MINIMAX_ERROR_CODES.SUCCESS]: {
        code: 0,
        message: "Success",
        userMessage: "Operation completed successfully.",
        recommendedAction: "None.",
        retryable: false,
    },
    [exports.MINIMAX_ERROR_CODES.RATE_LIMIT]: {
        code: 1002,
        message: "Rate limit exceeded",
        userMessage: "Rate limit exceeded. Please wait a moment before retrying.",
        recommendedAction: "Wait a few seconds before retrying the request.",
        retryable: true,
    },
    [exports.MINIMAX_ERROR_CODES.AUTH_FAILED]: {
        code: 1004,
        message: "Authentication failed",
        userMessage: "Authentication failed. Check your API key.",
        recommendedAction: "Verify your MINIMAX_API_KEY environment variable is correct.",
        retryable: false,
    },
    [exports.MINIMAX_ERROR_CODES.INSUFFICIENT_BALANCE]: {
        code: 1008,
        message: "Insufficient account balance",
        userMessage: "Insufficient balance. Please check your account.",
        recommendedAction: "Check your MiniMax account balance and upgrade if needed.",
        retryable: false,
    },
    [exports.MINIMAX_ERROR_CODES.SENSITIVE_CONTENT]: {
        code: 1026,
        message: "Sensitive content detected",
        userMessage: "Sensitive content detected in your prompt or lyrics. Please modify and retry.",
        recommendedAction: "Revise the prompt or lyrics to remove potentially sensitive content.",
        retryable: false,
    },
    [exports.MINIMAX_ERROR_CODES.INVALID_PARAMETERS]: {
        code: 2013,
        message: "Invalid parameters",
        userMessage: "Invalid input parameters. Please check your request.",
        recommendedAction: "Review the input parameters for your request and ensure they meet the validation rules.",
        retryable: false,
    },
    [exports.MINIMAX_ERROR_CODES.INVALID_API_KEY]: {
        code: 2049,
        message: "Invalid API key",
        userMessage: "The API key is invalid or malformed.",
        recommendedAction: "Verify your MINIMAX_API_KEY is a valid MiniMax API key.",
        retryable: false,
    },
};
/**
 * Maps a MiniMax status code to a user-friendly error info object.
 * Unknown codes return a generic fallback.
 */
function getMinMaxError(statusCode) {
    return (ERROR_MAP[statusCode] ?? {
        code: statusCode,
        message: "Unknown error",
        userMessage: `An unexpected error occurred (code: ${statusCode}).`,
        recommendedAction: "Check MiniMax API documentation or try again later.",
        retryable: false,
    });
}
/**
 * Checks if a MiniMax status code indicates a retryable error.
 */
function isRetryableError(statusCode) {
    return getMinMaxError(statusCode).retryable;
}
/**
 * Thrown when the MINIMAX_API_KEY environment variable is missing.
 */
class MissingApiKeyError extends Error {
    code = "MISSING_API_KEY";
    constructor() {
        super("MINIMAX_API_KEY environment variable is not set. " +
            "Please set it before using this MCP server.");
        this.name = "MissingApiKeyError";
    }
}
exports.MissingApiKeyError = MissingApiKeyError;
/**
 * Thrown when a MiniMax API call returns a non-zero status code.
 */
class MinMaxApiError extends Error {
    statusCode;
    retryable;
    recommendedAction;
    constructor(statusCode) {
        const info = getMinMaxError(statusCode);
        super(info.userMessage);
        this.name = "MinMaxApiError";
        this.statusCode = statusCode;
        this.retryable = info.retryable;
        this.recommendedAction = info.recommendedAction;
    }
}
exports.MinMaxApiError = MinMaxApiError;
/**
 * Thrown when HTTP fetch itself fails (network error, non-OK response, etc.)
 */
class MinMaxNetworkError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = "MinMaxNetworkError";
        this.cause = cause;
    }
}
exports.MinMaxNetworkError = MinMaxNetworkError;
/**
 * Thrown when response JSON parsing fails
 */
class MinMaxParseError extends Error {
    constructor(cause) {
        super("Failed to parse MiniMax API response as JSON.");
        this.name = "MinMaxParseError";
        this.cause = cause;
    }
}
exports.MinMaxParseError = MinMaxParseError;
/**
 * Thrown when input validation fails
 */
class ValidationError extends Error {
    code = "VALIDATION_ERROR";
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
