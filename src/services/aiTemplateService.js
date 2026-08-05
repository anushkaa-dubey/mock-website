/**
 * aiTemplateService.js
 *
 * The module in the application that interfaces with LLM services (Groq API).
 * Provides a single public function: generateTemplate({ prompt, currentTemplate })
 *
 * Provider: Groq OpenAI-compatible API
 * Models: openai/gpt-oss-120b -> moonshotai/kimi-k2-instruct-0905 -> llama-3.3-70b-versatile
 */

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
const IS_DEV = import.meta.env.DEV === true;

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'moonshotai/kimi-k2-instruct-0905',
  'llama-3.3-70b-versatile',
];

const log = {
  info: (...a) => IS_DEV && console.log('[aiTemplateService]', ...a),
  warn: (...a) => IS_DEV && console.warn('[aiTemplateService]', ...a),
  error: (...a) => IS_DEV && console.error('[aiTemplateService]', ...a),
};

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
 * Generate or modify a PDF template using Groq API (or mock fallback).
 *
 * @param {{ prompt: string, currentTemplate: string }} options
 * @returns {Promise<string>} The generated / modified HTML.
 */
export async function generateTemplate({ prompt, currentTemplate }) {
  // ── Mock path (no API key configured) ─────────────────────────────────────
  if (!API_KEY) {
    log.warn('No Groq API key configured — returning mock HTML.');
    return new Promise(resolve => setTimeout(() => resolve(MOCK_RESPONSE_HTML), 800));
  }

  // ── Build user message ─────────────────────────────────────────────────────
  const TEMPLATE_CHAR_LIMIT = 6000;
  let templateSnippet = currentTemplate || '';
  if (templateSnippet.length > TEMPLATE_CHAR_LIMIT) {
    templateSnippet =
      templateSnippet.slice(0, TEMPLATE_CHAR_LIMIT) +
      `\n<!-- ... template truncated at ${TEMPLATE_CHAR_LIMIT} chars to avoid filter — full template will be reconstructed -->`;
  }

  const userContent = templateSnippet
    ? `Current template HTML:\n\`\`\`html\n${templateSnippet}\n\`\`\`\n\nUser instruction: ${prompt}`
    : `User instruction: ${prompt}`;

  let lastError = null;

  for (const model of GROQ_MODELS) {
    log.info(`Trying Groq model: ${model}, template chars: ${templateSnippet.length}`);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            { role: 'user', content: userContent },
          ],
          temperature: 0.4,
          max_tokens: 4096,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Groq API error (${model}): ${errorMsg}`);
      }

      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error(`Groq model ${model} returned an empty response.`);
      }

      return stripCodeFences(text.trim());
    } catch (err) {
      log.warn(`Model ${model} failed:`, err.message);
      lastError = err;
      continue;
    }
  }

  log.error('All Groq models failed.');
  throw lastError || new Error('Failed to generate template with Groq API.');
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
