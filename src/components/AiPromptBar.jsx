import { useRef, useState } from 'react';
import { sanitizePrompt } from '@/utils/promptSanitizer';
import { generateTemplate } from '@/services/aiTemplateService';

/**
 * AiPromptBar
 *
 * A horizontal AI toolbar rendered above the CKEditor canvas in the PDF
 * Template editor. Responsible for:
 *   - Collecting and validating the user prompt
 *   - Calling aiTemplateService.generateTemplate()
 *   - Replacing the editor content on success
 *   - Surfacing loading / error states
 *
 * Props:
 *   @param {React.RefObject} editorRef   – ref to the CkEditor4 instance
 *                                          (must expose .getData() and .setData())
 *   @param {boolean}         disabled    – disable while parent is saving
 */
function AiPromptBar({ editorRef, disabled }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [importHover, setImportHover] = useState(false);
  const [genHover, setGenHover] = useState(false);
  const inflight = useRef(false); // prevent duplicate requests

  const handleGenerate = async () => {
    if (inflight.current || disabled) return;

    setError('');
    setSuccessMsg('');

    // 1. Sanitize prompt
    const sanitized = sanitizePrompt(prompt);
    if (!sanitized.ok) {
      setError(sanitized.error);
      return;
    }

    // 2. Get current editor content
    const currentTemplate = editorRef.current?.getData?.() ?? '';

    // 3. Lock & call service
    inflight.current = true;
    setLoading(true);
    try {
      const generatedHtml = await generateTemplate({
        prompt: sanitized.value,
        currentTemplate,
      });

      // 4. Push result into CKEditor only on success
      if (editorRef.current?.setData) {
        editorRef.current.setData(generatedHtml);
      }

      setSuccessMsg('Template updated successfully.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      // Never touch the editor on failure
      setError(err?.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl + Enter triggers generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleImport = () => {
    // Stub — OCR not yet implemented
    alert('📎 Import PDF / Image — Coming Soon\n\nThis feature will allow you to upload an existing PDF or image and convert it into an editable HTML template.');
  };

  const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const hasValidKey = Boolean(rawApiKey && typeof rawApiKey === 'string' && rawApiKey.trim().length > 10);

  return (
    <div className="ai-prompt-bar">
      {/* ── Header row ── */}
      <div className="ai-prompt-bar__header">
        <span className="ai-prompt-bar__title">
          {/* <span className="ai-prompt-bar__bolt">⚡</span> */}
          AI Prompt
        </span>
        {!hasValidKey && (
          <span className="ai-prompt-bar__demo-badge">
            Demo Mode — No API Key
          </span>
        )}
      </div>

      {/* ── Main input row ── */}
      <div className="ai-prompt-bar__row">
        <div className="ai-prompt-bar__input-wrap">
          <textarea
            id="ai-prompt-input"
            className="ai-prompt-bar__textarea"
            rows={2}
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="Describe how you want to generate or modify the PDF template...  e.g. Make the header blue, Add a company logo placeholder, Convert to clean A4 format"
            disabled={loading || disabled}
            maxLength={4000}
          />
          <div className="ai-prompt-bar__char-count">
            {prompt.length}/4000
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="ai-prompt-bar__actions">
          {/* Import PDF / Image (UI stub) */}
          <button
            type="button"
            id="ai-import-btn"
            className="ai-prompt-bar__import-btn"
            onClick={handleImport}
            disabled={loading || disabled}
            title="Import PDF or Image (Coming Soon)"
            onMouseEnter={() => setImportHover(true)}
            onMouseLeave={() => setImportHover(false)}
            style={{
              background: importHover ? '#F1F5F9' : '#FFFFFF',
              borderColor: importHover ? '#94A3B8' : '#CBD5E1',
            }}
          >
            <i className="fa fa-upload" style={{ fontSize: 12, marginRight: 6 }} />
            Import PDF&nbsp;/&nbsp;Image
          </button>

          {/* Generate */}
          <button
            type="button"
            id="ai-generate-btn"
            className="ai-prompt-bar__generate-btn"
            onClick={handleGenerate}
            disabled={loading || disabled || !prompt.trim()}
            title="Generate template (Ctrl+Enter)"
            onMouseEnter={() => setGenHover(true)}
            onMouseLeave={() => setGenHover(false)}
            style={{
              opacity: loading || disabled || !prompt.trim() ? 0.65 : 1,
              background:
                genHover && !loading && !disabled && prompt.trim()
                  ? 'linear-gradient(135deg, #0055BB, #0066CC)'
                  : 'linear-gradient(135deg, #0066CC, #17A2B8)',
            }}
          >
            {loading ? (
              <>
                <i className="fa fa-circle-o-notch fa-spin" style={{ fontSize: 12, marginRight: 6 }} />
                Generating...
              </>
            ) : (
              <>
                <i className="fa fa-magic" style={{ fontSize: 12, marginRight: 6 }} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Success banner ── */}
      {successMsg && (
        <div className="ai-prompt-bar__success" role="status">
          <i className="fa fa-check-circle" style={{ marginRight: 6, flexShrink: 0 }} />
          {successMsg}
          <button
            type="button"
            className="ai-prompt-bar__error-dismiss"
            onClick={() => setSuccessMsg('')}
            title="Dismiss"
            style={{ color: '#15803D' }}
          >
            <i className="fa fa-times" />
          </button>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="ai-prompt-bar__error" role="alert">
          <i className="fa fa-exclamation-circle" style={{ marginRight: 6, flexShrink: 0 }} />
          {error}
          <button
            type="button"
            className="ai-prompt-bar__error-dismiss"
            onClick={() => setError('')}
            title="Dismiss"
          >
            <i className="fa fa-times" />
          </button>
        </div>
      )}

      {/* ── Keyboard hint ── */}
      <div className="ai-prompt-bar__hint">
        <i className="fa fa-keyboard-o" style={{ marginRight: 4, opacity: 0.6 }} />
        Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to generate &nbsp;·&nbsp;
        The AI always receives the current template so it can modify instead of overwriting.
      </div>
    </div>
  );
}

export default AiPromptBar;
