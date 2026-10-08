import OpenAI from 'openai';

// What a failed call means: worth another try, the flex tier full, or an account out of credits.

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

/**
 * Worth a second try: a retryable HTTP status, or no response at all (a timeout or a dropped
 * connection has no status). The SDK's timeout error extends its connection error.
 */
export function isTransient(err) {
  return RETRYABLE.has(err?.status || err?.statusCode) || err instanceof OpenAI.APIConnectionError;
}

/** OpenAI refusing a flex-tier request for lack of capacity (a 429 that is not a rate limit). */
export function isFlexUnavailable(err) {
  return (err?.status || err?.statusCode) === 429 && (err?.code === 'resource_unavailable' || /resource.?unavailable/i.test(err?.message || ''));
}

/**
 * An account out of credits also answers 429 (OpenAI) or an overdue-payment error (Alibaba Cloud),
 * but waiting will not help, so it is never retried.
 */
export function isOutOfCredits(err) {
  return (
    err?.code === 'insufficient_quota' ||
    err?.code === 'Arrearage' ||
    /no credits remaining|exceeded your current quota|arrearage|overdue payment/i.test(err?.message || '')
  );
}
