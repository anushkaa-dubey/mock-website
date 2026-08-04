/**
 * promptSanitizer.js
 *
 * A reusable, provider-agnostic utility for validating and cleaning
 * user-supplied AI prompts before they are sent to any LLM backend.
 *
 * Rules applied (in order):
 *  1. Strip ASCII / Unicode control characters (except \n, \r, \t).
 *  2. Normalise repeated whitespace runs to a single space.
 *  3. Trim leading / trailing whitespace.
 *  4. Reject empty prompts.
 *  5. Reject prompts that exceed MAX_PROMPT_LENGTH characters.
 */

const MAX_PROMPT_LENGTH = 4000;

/**
 * Result shape returned by sanitize():
 * @typedef {{ ok: true, value: string } | { ok: false, error: string }} SanitizeResult
 */

/**
 * Sanitize a raw prompt string.
 *
 * @param {string} raw - The raw prompt typed by the user.
 * @returns {SanitizeResult}
 */
export function sanitizePrompt(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Prompt must be a string.' };
  }

  // 1. Remove control characters except newline (\n), carriage return (\r), tab (\t)
  //    U+0000-U+0008, U+000B-U+000C, U+000E-U+001F, U+007F-U+009F
  let value = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // 2. Normalise consecutive spaces / non-breaking spaces to a single space
  //    (preserve intentional newlines for multi-line prompts)
  value = value.replace(/[ \t\xA0]+/g, ' ');

  // 3. Trim
  value = value.trim();

  // 4. Reject empty
  if (value.length === 0) {
    return { ok: false, error: 'Prompt cannot be empty. Please describe what you want to generate or modify.' };
  }

  // 5. Reject excessively long prompts
  if (value.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      error: `Prompt is too long (${value.length} characters). Please keep it under ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  return { ok: true, value };
}
