/**
 * MiniMax Music MCP Server
 * Error code mapping from MiniMax API base_resp.status_code
 * to user-friendly MCP error messages and recommended actions.
 */

/** Known MiniMax API error codes */
export const MINIMAX_ERROR_CODES = {
  SUCCESS: 0,
  RATE_LIMIT: 1002,
  AUTH_FAILED: 1004,
  INSUFFICIENT_BALANCE: 1008,
  SENSITIVE_CONTENT: 1026,
  INVALID_PARAMETERS: 2013,
  INVALID_API_KEY: 2049,
} as const;

export type MinMaxStatusCode = (typeof MINIMAX_ERROR_CODES)[keyof typeof MINIMAX_ERROR_CODES];

/** Human-readable error info */
export interface MinMaxErrorInfo {
  code: number;
  message: string;
  userMessage: string;
  recommendedAction: string;
  retryable: boolean;
}

const ERROR_MAP: Record<number, MinMaxErrorInfo> = {
  [MINIMAX_ERROR_CODES.SUCCESS]: {
    code: 0,
    message: "Success",
    userMessage: "Operation completed successfully.",
    recommendedAction: "None.",
    retryable: false,
  },
  [MINIMAX_ERROR_CODES.RATE_LIMIT]: {
    code: 1002,
    message: "Rate limit exceeded",
    userMessage: "Rate limit exceeded. Please wait a moment before retrying.",
    recommendedAction: "Wait a few seconds before retrying the request.",
    retryable: true,
  },
  [MINIMAX_ERROR_CODES.AUTH_FAILED]: {
    code: 1004,
    message: "Authentication failed",
    userMessage: "Authentication failed. Check your API key.",
    recommendedAction: "Verify your MINIMAX_API_KEY environment variable is correct.",
    retryable: false,
  },
  [MINIMAX_ERROR_CODES.INSUFFICIENT_BALANCE]: {
    code: 1008,
    message: "Insufficient account balance",
    userMessage: "Insufficient balance. Please check your account.",
    recommendedAction: "Check your MiniMax account balance and upgrade if needed.",
    retryable: false,
  },
  [MINIMAX_ERROR_CODES.SENSITIVE_CONTENT]: {
    code: 1026,
    message: "Sensitive content detected",
    userMessage: "Sensitive content detected in your prompt or lyrics. Please modify and retry.",
    recommendedAction: "Revise the prompt or lyrics to remove potentially sensitive content.",
    retryable: false,
  },
  [MINIMAX_ERROR_CODES.INVALID_PARAMETERS]: {
    code: 2013,
    message: "Invalid parameters",
    userMessage: "Invalid input parameters. Please check your request.",
    recommendedAction: "Review the input parameters for your request and ensure they meet the validation rules.",
    retryable: false,
  },
  [MINIMAX_ERROR_CODES.INVALID_API_KEY]: {
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
export function getMinMaxError(statusCode: number): MinMaxErrorInfo {
  return (
    ERROR_MAP[statusCode] ?? {
      code: statusCode,
      message: "Unknown error",
      userMessage: `An unexpected error occurred (code: ${statusCode}).`,
      recommendedAction: "Check MiniMax API documentation or try again later.",
      retryable: false,
    }
  );
}

/**
 * Checks if a MiniMax status code indicates a retryable error.
 */
export function isRetryableError(statusCode: number): boolean {
  return getMinMaxError(statusCode).retryable;
}

/**
 * Thrown when the MINIMAX_API_KEY environment variable is missing.
 */
export class MissingApiKeyError extends Error {
  readonly code = "MISSING_API_KEY";
  constructor() {
    super(
      "MINIMAX_API_KEY environment variable is not set. " +
        "Please set it before using this MCP server."
    );
    this.name = "MissingApiKeyError";
  }
}

/**
 * Thrown when a MiniMax API call returns a non-zero status code.
 */
export class MinMaxApiError extends Error {
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly recommendedAction: string;

  constructor(statusCode: number) {
    const info = getMinMaxError(statusCode);
    super(info.userMessage);
    this.name = "MinMaxApiError";
    this.statusCode = statusCode;
    this.retryable = info.retryable;
    this.recommendedAction = info.recommendedAction;
  }
}

/**
 * Thrown when HTTP fetch itself fails (network error, non-OK response, etc.)
 */
export class MinMaxNetworkError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MinMaxNetworkError";
    this.cause = cause;
  }
}

/**
 * Thrown when response JSON parsing fails
 */
export class MinMaxParseError extends Error {
  constructor(cause?: unknown) {
    super("Failed to parse MiniMax API response as JSON.");
    this.name = "MinMaxParseError";
    this.cause = cause;
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}