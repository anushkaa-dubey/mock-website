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

const CkEditor4 = forwardRef(function CkEditor4({ value, onChange, disabled = false }, ref) {
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
  }), [value]);

  useEffect(() => {
    let cancelled = false;

    loadCkEditor()
      .then((CKEDITOR) => {
        if (cancelled || !textareaRef.current) return;

        const editor = CKEDITOR.replace(textareaRef.current, {
          allowedContent: true,
          language: 'en',
          entities: false,
          basicEntities: false,
          autoParagraph: false,
          forcePasteAsPlainText: true,
          pasteFilter: 'plain-text',
          enterMode: CKEDITOR.ENTER_BR,
          height: 420,
          removeButtons: 'Cut,Copy,Paste,PasteFromWord,Save,NewPage,ExportPdf,Preview,Print,Templates',
        });
        editorRef.current = editor;

        editor.on('instanceReady', () => {
          editor.setData(value || '');
          editor.setReadOnly(disabled);
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
