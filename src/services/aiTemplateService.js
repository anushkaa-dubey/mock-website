/**
 * aiTemplateService.js
 *
 * The ONLY module in the application that knows about Gemini (or any LLM).
 * Provides a single public function: generateTemplate({ prompt, currentTemplate })
 *
 * Provider-switch contract:
 *   - If you need to move from Gemini → OpenAI → Claude, change ONLY this file.
 *   - The UI (AiPromptBar) and orchestrator (PdfTemplateTab) never import the SDK.
 *
 * Fallback strategy:
 *   - If VITE_GEMINI_API_KEY is absent, a realistic mocked HTML response is returned
 *     so the complete UI flow continues to work during frontend development.
 *
 * Model:
 *   - Resolved from VITE_GEMINI_MODEL (default: gemini-2.0-flash).
 *   - Uses the official @google/genai SDK — no manual fetch() or endpoint construction.
 */

import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";;
const IS_DEV = import.meta.env.DEV === true;

// ─── Dev-only logger ─────────────────────────────────────────────────────────

const log = {
  info: (...a) => IS_DEV && console.log('[aiTemplateService]', ...a),
  warn: (...a) => IS_DEV && console.warn('[aiTemplateService]', ...a),
  error: (...a) => IS_DEV && console.error('[aiTemplateService]', ...a),
};

// ─── SDK client (created once) ───────────────────────────────────────────────

let _client = null;

function getClient() {
  if (!_client) _client = new GoogleGenAI({ apiKey: API_KEY });
  return _client;
}

// ─── Error message helpers ────────────────────────────────────────────────────

/**
 * Inspect an SDK error and return a clean user-facing message.
 * The SDK throws plain Error objects whose `.message` may contain the HTTP status.
 *
 * @param {unknown} err
 * @returns {string}
 */
function parseSDKError(err) {
  const msg = err?.message ?? String(err);

  // 429 RESOURCE_EXHAUSTED
  if (msg.includes('429') || msg.toLowerCase().includes('resource_exhausted') || msg.toLowerCase().includes('quota')) {
    // Try to pull a retry delay hint from the message
    const secondsMatch = msg.match(/(\d+)\s*s(?:econds?)?/i);
    if (secondsMatch) {
      const s = parseInt(secondsMatch[1], 10);
      if (!isNaN(s) && s > 0) {
        return `Gemini API rate limit exceeded. Please try again in ${s} second${s !== 1 ? 's' : ''} or use another API key.`;
      }
    }
    return 'Gemini API rate limit exceeded. Please try again later or use another API key.';
  }

  // 404 model not found
  if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
    return `Model "${MODEL_NAME}" was not found or is unavailable for your API key. Check VITE_GEMINI_MODEL in your env file.`;
  }

  // 401 / 403
  if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('permission')) {
    return 'Gemini API key is invalid or lacks permission. Please check VITE_GEMINI_API_KEY.';
  }

  // Generic fallback — include the original message but strip raw JSON if present
  try {
    const json = JSON.parse(msg);
    const inner = json?.error?.message;
    if (inner) return `Gemini error (${MODEL_NAME}): ${inner}`;
  } catch { /* not JSON */ }

  return `Gemini error (${MODEL_NAME}): ${msg}`;
}

// ─── System instruction ───────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are an expert HTML template designer specialised in creating professional, 
printable Work Permit PDF documents. When given an existing template and a user instruction, 
you modify the template accordingly — or generate a new one from scratch if asked.

Rules:
- Return ONLY valid, self-contained HTML. No markdown fences, no explanations, no preamble.
- Use inline CSS only — no <link> tags, no <script> tags, no external resources.
- Keep the template compatible with Blade-style server-side rendering 
  (e.g. {{ $wp['Permit Type'] }}, @foreach($approval_levels as $lvl)…@endforeach).
- Preserve all existing Blade template tags unless explicitly asked to remove them.
- Design for A4 printable output: max-width 210mm, clear section headings, proper margins.
- Use a clean, professional aesthetic suitable for a health & safety work permit.`;

// ─── Mock response (no API key) ───────────────────────────────────────────────
const MOCK_RESPONSE_HTML = `
<html>
<head><style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a2e; padding: 24px 32px; margin: 0; }
  .wp-header { background: linear-gradient(135deg, #0B4A54 0%, #17A2B8 100%); color: #fff; padding: 18px 24px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .wp-header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.02em; }
  .wp-header .seq { font-size: 13px; opacity: 0.85; }
  .wp-body { border: 1px solid #CBD5E1; border-top: none; border-radius: 0 0 6px 6px; padding: 20px 24px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .field label { font-size: 10px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }
  .field .value { font-size: 13px; color: #0F172A; font-weight: 500; padding: 4px 0; border-bottom: 1px dotted #E2E8F0; min-height: 22px; }
  .approval-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .approval-table th { background: #F8FAFC; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; padding: 6px 10px; border: 1px solid #E2E8F0; }
  .approval-table td { padding: 7px 10px; border: 1px solid #E2E8F0; }
  .signature-row { display: flex; justify-content: space-between; margin-top: 32px; gap: 24px; }
  .sig-block { flex: 1; text-align: center; border-top: 1px solid #94A3B8; padding-top: 6px; font-size: 11px; color: #64748B; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: #DCFCE7; color: #15803D; }
</style></head>
<body>
  <div class="wp-header">
    <h1>&#128274; Work Permit</h1>
    <div class="seq">No: {{ $wp['Sequence No'] }}</div>
  </div>
  <div class="wp-body">
    <div class="section">
      <div class="section-title">Permit Details</div>
      <div class="grid">
        <div class="field"><label>Permit Type</label><div class="value">{{ $wp['Permit Type'] }}</div></div>
        <div class="field"><label>Status</label><div class="value"><span class="badge">{{ $wp['Status'] }}</span></div></div>
        <div class="field"><label>Scheduled Date</label><div class="value">{{ $wp['Scheduled Date'] }}</div></div>
        <div class="field"><label>Due Date</label><div class="value">{{ $wp['Due Date'] }}</div></div>
        <div class="field"><label>Location</label><div class="value">{{ $wp['Location'] }}</div></div>
        <div class="field"><label>Asset / Equipment</label><div class="value">{{ $wp['Asset'] }}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Description of Work</div>
      <div style="border:1px solid #E2E8F0;border-radius:4px;padding:10px;min-height:48px;font-size:13px;">
        {{ $wp['Description'] }}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Vendor &amp; Requester</div>
      <div class="grid">
        <div class="field"><label>Vendor Name</label><div class="value">{{ $wp['Vendor'] }}</div></div>
        <div class="field"><label>Requester Name</label><div class="value">{{ $wp['Requester'] }}</div></div>
        <div class="field"><label>Company / Facility</label><div class="value">{{ $company }}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Approval Chain</div>
      <table class="approval-table">
        <thead>
          <tr><th>Level</th><th>Role</th><th>Status</th><th>Date</th></tr>
        </thead>
        <tbody>
          @foreach($approval_levels as $lvl)
          <tr>
            <td>{{ $lvl['level'] }}</td>
            <td>{{ $lvl['role'] }}</td>
            <td>{{ $lvl['status'] }}</td>
            <td>{{ $lvl['updated_at'] }}</td>
          </tr>
          @endforeach
        </tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Dynamic Fields</div>
      @foreach($dynamic_fields as $field)
      <div style="margin-bottom:6px;"><strong>{{ $field['label'] }}:</strong> {{ $field['value'] }}</div>
      @endforeach
    </div>
    <div class="signature-row">
      <div class="sig-block">____________________<br/>Requester Signature</div>
      <div class="sig-block">____________________<br/>Safety Officer Signature</div>
      <div class="sig-block">____________________<br/>Approver Signature</div>
    </div>
  </div>
</body>
</html>`.trim();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate or modify a PDF template using the Gemini SDK (or mock fallback).
 *
 * Uses client.models.generateContent() from @google/genai.
 * No model discovery, no waterfall, no manual fetch().
 *
 * On failure this function always throws — it never returns a fallback string,
 * so the caller's existing CKEditor content is never silently replaced.
 *
 * @param {{ prompt: string, currentTemplate: string }} options
 * @returns {Promise<string>} The generated / modified HTML.
 * @throws {Error} On quota exhaustion, model errors, or empty responses.
 */
export async function generateTemplate({ prompt, currentTemplate }) {
  // ── Mock path (no API key configured) ─────────────────────────────────────
  if (!API_KEY) {
    log.warn('No API key — returning mock HTML.');
    return new Promise(resolve => setTimeout(() => resolve(MOCK_RESPONSE_HTML), 1200));
  }

  // ── Build user message ─────────────────────────────────────────────────────
  const userContent = currentTemplate
    ? `Current template HTML:\n\`\`\`html\n${currentTemplate}\n\`\`\`\n\nUser instruction: ${prompt}`
    : `User instruction: ${prompt}`;

  log.info(`generateContent → model: ${MODEL_NAME}`);

  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      contents: userContent,
    });

    const text = response.text;
    if (!text) throw new Error('Gemini returned an empty response. Please try again.');

    log.info('generateContent succeeded.');
    return stripCodeFences(text.trim());

  } catch (err) {
    log.error('generateContent failed:', err?.message ?? err);
    throw new Error(parseSDKError(err));
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip ```html … ``` or ``` … ``` markdown fences if the model wraps output.
 * @param {string} text
 * @returns {string}
 */
function stripCodeFences(text) {
  const fencePattern = /^```(?:html)?\n?([\s\S]*?)\n?```$/i;
  const match = text.match(fencePattern);
  return match ? match[1].trim() : text;
}
