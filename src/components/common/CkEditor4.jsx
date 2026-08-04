import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

let ckEditorLoader;

function loadCkEditor() {
  if (window.CKEDITOR) return Promise.resolve(window.CKEDITOR);
  if (ckEditorLoader) return ckEditorLoader;

  ckEditorLoader = new Promise((resolve, reject) => {
    const basePath = `${import.meta.env.BASE_URL}ckeditor4/`;
    window.CKEDITOR_BASEPATH = basePath;

    const existing = document.querySelector('script[data-workpermit-ckeditor]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.CKEDITOR), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load template editor.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `${basePath}ckeditor.js`;
    script.async = true;
    script.dataset.workpermitCkeditor = 'true';
    script.onload = () => resolve(window.CKEDITOR);
    script.onerror = () => reject(new Error('Failed to load template editor.'));
    document.head.appendChild(script);
  });

  return ckEditorLoader;
}

const CkEditor4 = forwardRef(function CkEditor4({ value, onChange, disabled = false, autoGrow = true, minHeight = 650 }, ref) {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    getData: () => {
      const editor = editorRef.current;
      if (editor && editor.status === 'ready') return editor.getData();
      return textareaRef.current?.value ?? value ?? '';
    },
    setData: (html) => {
      const editor = editorRef.current;
      if (editor && editor.status === 'ready') {
        editor.setData(html);
      } else if (textareaRef.current) {
        textareaRef.current.value = html;
        onChangeRef.current?.(html);
      }
    },
    insertHtml: (html) => {
      const editor = editorRef.current;
      if (editor && editor.status === 'ready') {
        if (editor.mode === 'wysiwyg') {
          editor.insertHtml(html);
        } else if (editor.mode === 'source') {
          const textarea = editor.container?.findOne('textarea.cke_source');
          if (textarea && textarea.$) {
            const el = textarea.$;
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const val = el.value;
            el.value = val.substring(0, start) + html + val.substring(end);
            el.selectionStart = el.selectionEnd = start + html.length;
            el.focus();
            onChangeRef.current?.(el.value);
            // Trigger auto-resize on insertion in source mode
            el.style.height = 'auto';
            el.style.height = Math.max(minHeight, el.scrollHeight + 30) + 'px';
          }
        }
      }
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }), [value, minHeight]);

  useEffect(() => {
    let cancelled = false;

    loadCkEditor()
      .then((CKEDITOR) => {
        if (cancelled || !textareaRef.current) return;

        const config = {
          allowedContent: true,
          language: 'en',
          entities: false,
          basicEntities: false,
          autoParagraph: false,
          forcePasteAsPlainText: true,
          pasteFilter: 'plain-text',
          enterMode: CKEDITOR.ENTER_BR,
          removeButtons: 'Cut,Copy,Paste,PasteFromWord,Save,NewPage,ExportPdf,Preview,Print,Templates',
        };

        if (autoGrow) {
          config.extraPlugins = 'autogrow';
          config.autoGrow_minHeight = minHeight;
          config.autoGrow_maxHeight = 0; // 0 = unlimited height
          config.autoGrow_bottomSpace = 30;
          config.autoGrow_onStartup = true;
          config.resize_enabled = true;
        }

        const editor = CKEDITOR.replace(textareaRef.current, config);
        editorRef.current = editor;

        const injectIframeStyles = () => {
          try {
            const doc = editor.document?.$;
            if (doc && !doc.getElementById('ckeditor-natural-scroll-style')) {
              const style = doc.createElement('style');
              style.id = 'ckeditor-natural-scroll-style';
              style.innerHTML = `
                body {
                  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                  font-size: 14px !important;
                  line-height: 1.65 !important;
                  color: #1e293b !important;
                  padding: 20px 24px !important;
                  margin: 0 !important;
                  background: #ffffff !important;
                }
                table {
                  max-width: 100% !important;
                }
              `;
              doc.head.appendChild(style);
            }
          } catch (e) {
            // Safely ignore iframe access restrictions
          }
        };

        const resizeSourceTextarea = () => {
          if (editor.mode === 'source') {
            const textarea = editor.container?.findOne('textarea.cke_source');
            if (textarea && textarea.$) {
              const el = textarea.$;
              el.style.minHeight = minHeight + 'px';
            }
          }
        };

        editor.on('instanceReady', () => {
          editor.setData(value || '', () => {
            try {
              if (autoGrow && editor.execCommand) {
                editor.execCommand('autogrow');
              }
            } catch (err) {
              // ignore
            }
          });
          editor.setReadOnly(disabled);
          injectIframeStyles();
        });

        editor.on('mode', () => {
          if (editor.mode === 'wysiwyg') {
            setTimeout(injectIframeStyles, 60);
          } else if (editor.mode === 'source') {
            setTimeout(resizeSourceTextarea, 60);
            const textarea = editor.container?.findOne('textarea.cke_source');
            if (textarea && textarea.$) {
              textarea.$.addEventListener('input', resizeSourceTextarea);
            }
          }
        });

        editor.on('change', () => {
          onChangeRef.current?.(editor.getData());
        });
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Failed to load template editor.');
      });

    return () => {
      cancelled = true;
      if (editorRef.current) {
        editorRef.current.destroy(true);
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.status !== 'ready') return;
    const nextValue = value || '';
    if (editor.getData() !== nextValue) editor.setData(nextValue);
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.status === 'ready') editor.setReadOnly(disabled);
  }, [disabled]);

  return (
    <>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <textarea
        ref={textareaRef}
        className="form-control form-control-sm"
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        rows={16}
        defaultValue={value || ''}
        disabled={disabled}
      />
    </>
  );
});

export default CkEditor4;
