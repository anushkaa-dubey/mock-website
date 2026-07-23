import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = '-- Select --',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o =>
    (o.searchText || o.label || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="form-control form-control-sm d-flex justify-content-between align-items-center"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          background: disabled ? '#e9ecef' : '#fff',
          color: selected ? '#333' : '#999',
        }}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? selected.label : placeholder}
        </span>
        {value && !disabled && (
          <i
            className="fa fa-times text-muted me-2"
            style={{ fontSize: '11px', flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
          />
        )}
        <i
          className={`fa fa-chevron-${open ? 'up' : 'down'} text-muted`}
          style={{ fontSize: '11px', flexShrink: 0 }}
        />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ position: 'relative' }}>
              <i className="fa fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: '12px' }} />
              <input
                autoFocus
                type="text"
                className="form-control form-control-sm"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ paddingLeft: '28px', borderRadius: '6px' }}
              />
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '240px' }}>
            {filtered.length === 0 ? (
              <div className="text-muted text-center py-3" style={{ fontSize: '13px' }}>
                <i className="fa fa-search me-1" />No results found
              </div>
            ) : (
              filtered.map((opt, idx) => (
                <div
                  key={opt.value ?? idx}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                  style={{
                    padding: '9px 14px',
                    cursor: 'pointer',
                    background: opt.value === value ? '#e8f6f8' : 'transparent',
                    color: opt.value === value ? '#17a2b8' : '#333',
                    fontSize: '13px',
                    fontWeight: opt.value === value ? '600' : '400',
                    borderLeft: opt.value === value ? '3px solid #17a2b8' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {required && (
        <input
          tabIndex={-1}
          value={value || ''}
          onChange={() => {}}
          required
          style={{ opacity: 0, position: 'absolute', bottom: 0, left: 0, width: '100%', height: '1px', pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
