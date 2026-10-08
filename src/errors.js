/**
 * The error the AI code throws. `code` is stable for a caller to branch on ('ai_no_credits',
 * 'upstream_failed', …), `message` is safe to show a user, and `expose` marks it as meant for
 * them, which is how the app's error handler passes it on with its `status`.
 */
export class AiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }

  static badRequest(message, details) {
    return new AiError(400, 'bad_request', message, details);
  }

  /** The model (or a provider) failed or answered unusably; the user can retry. */
  static upstream(message) {
    return new AiError(502, 'upstream_failed', message);
  }
}
