import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import formService from '@/services/formService';
import workPermitService from '@/services/workPermitService';
import SearchableSelect from '@/components/common/SearchableSelect';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SidebarList from '@/components/common/SidebarList';
import CkEditor4 from '@/components/common/CkEditor4';
import '@/scss/pdf-template.scss';


const FIELD_TYPES = [
  { value: 'text',     label: 'Text',     icon: 'fa-font' },
  { value: 'number',   label: 'Number',   icon: 'fa-hashtag' },
  { value: 'textarea', label: 'Textarea', icon: 'fa-align-left' },
  { value: 'select',   label: 'Dropdown', icon: 'fa-list' },
  { value: 'checkbox', label: 'Checkbox', icon: 'fa-check-square-o' },
  { value: 'date',     label: 'Date',     icon: 'fa-calendar' },
  { value: 'email',    label: 'Email',    icon: 'fa-envelope-o' },
];
const EMPTY_FIELD = { name: '', col_name: '', type: 'text', is_required: false, placeholder: '', options: [], is_multi_select: false };
const DISALLOWED_APPROVAL_ROLES = new Set(['resident', 'member']);
const normalizeRole = value => String(value || '').trim().toLowerCase();

// Portal dropdown — floats completely outside the table DOM so it never
// affects column widths, cell padding, or table layout whatsoever.
// Brand-aligned: Primary Blue #0066CC focus/selected states, MD shadow, SM border-radius on trigger.
function FieldTypePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = FIELD_TYPES.find(t => t.value === value);
  const filtered = FIELD_TYPES.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  // Compute fixed-position coords from the trigger element
  const openMenu = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: r.bottom + 4,
        left: r.left,
        minWidth: Math.max(r.width, 220),
        width: 280,
        zIndex: 99999,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const menu = open && createPortal(
    <div
      ref={menuRef}
      style={{
        ...menuStyle,
        background: '#fff',
        border: '1px solid #D1D5DB',
        borderRadius: 8,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Search box */}
      <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ position: 'relative' }}>
          <i className="fa fa-search" style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            color: '#9CA3AF', fontSize: 11, pointerEvents: 'none',
          }} />
          <input
            autoFocus
            type="text"
            placeholder="Search field type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', height: 32, paddingLeft: 28, paddingRight: 8,
              border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 12.5,
              outline: 'none', boxSizing: 'border-box', color: '#374151',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.target.style.borderColor = '#0066CC'; e.target.style.boxShadow = '0 0 0 3px rgba(0,102,204,0.12)'; }}
            onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Options */}
      <div style={{ overflowY: 'auto', maxHeight: 216, paddingBottom: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#9CA3AF', textAlign: 'center' }}>
            No matching types
          </div>
        ) : filtered.map(opt => {
          const isSel = opt.value === value;
          return (
            <div
              key={opt.value}
              onMouseDown={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                background: isSel ? '#EBF3FF' : 'transparent',
                color: isSel ? '#0066CC' : '#374151',
                fontSize: 13,
                fontWeight: isSel ? 600 : 400,
                borderLeft: isSel ? '2px solid #0066CC' : '2px solid transparent',
                transition: 'background 0.08s',
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >
              <i
                className={`fa ${opt.icon}`}
                style={{ fontSize: 11, color: isSel ? '#0066CC' : '#6B7280', flexShrink: 0, width: 14, textAlign: 'center' }}
              />
              <span style={{ flex: 1 }}>{opt.label}</span>
              {/* Checkmark on selected — consistent with MobilePermitTypeSelect */}
              {isSel && <i className="fa fa-check" style={{ fontSize: 11, color: '#0066CC', flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
          width: 190, minWidth: 190,
          height: 32, padding: '0 8px',
          cursor: 'pointer', userSelect: 'none',
          background: '#fff',
          fontSize: 13, borderRadius: 4,
          border: open ? '1.5px solid #0066CC' : '1px solid #D1D5DB',
          boxShadow: open ? '0 0 0 3px rgba(0,102,204,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
        onClick={() => open ? (setOpen(false), setSearch('')) : openMenu()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? (setOpen(false), setSearch('')) : openMenu(); } }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: selected ? '#374151' : '#9CA3AF' }}>
          {selected ? (
            <>
              <i className={`fa ${selected.icon}`} style={{ fontSize: 10, color: '#6B7280', marginRight: 6 }} />
              {selected.label}
            </>
          ) : (
            <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Select field type…</span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
          <i className={`fa fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, color: '#6B7280' }} />
        </span>
      </div>
      {menu}
    </>
  );
}

// Mobile-only searchable permit type dropdown
function MobilePermitTypeSelect({ types, selectedId, onSelect, activatingId, deleting }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = types.find(t => t.value === selectedId);
  const filtered = search.trim()
    ? types.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : types;

  const openMenu = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'absolute',
        top: r.bottom + window.scrollY + 6,
        left: r.left + window.scrollX,
        width: r.width,
        zIndex: 999999,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    const resizeHandler = () => { setOpen(false); setSearch(''); };
    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', resizeHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', resizeHandler);
    };
  }, [open]);

  const menu = open && createPortal(
    <div
      ref={menuRef}
      style={{
        ...menuStyle,
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
      }}
    >
      <div style={{ padding: 8, borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ position: 'relative' }}>
          <i className="fa fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 12 }} />
          <input
            autoFocus
            type="text"
            placeholder="Search permit types..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', height: 38, paddingLeft: 30, paddingRight: 10,
              border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No types found</div>
        ) : filtered.map(t => (
          <div
            key={t.value}
            onMouseDown={() => { onSelect(t.value); setOpen(false); setSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', cursor: 'pointer',
              background: t.value === selectedId ? '#E0F7FA' : 'transparent',
              borderLeft: t.value === selectedId ? '3px solid #17A2B8' : '3px solid transparent',
              fontSize: 14, fontWeight: t.value === selectedId ? 600 : 400,
              color: t.value === selectedId ? '#17A2B8' : '#374151',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (t.value !== selectedId) e.currentTarget.style.background = '#F8FAFC'; }}
            onMouseLeave={e => { if (t.value !== selectedId) e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{t.label}</span>
            {t.value === selectedId && <i className="fa fa-check" style={{ fontSize: 12, color: '#17A2B8' }} />}
            {activatingId === t.value && <i className="fa fa-circle-o-notch fa-spin" style={{ fontSize: 12, color: '#17A2B8' }} />}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ marginBottom: 16, position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
        Permit Type
      </label>
      <div
        ref={triggerRef}
        onClick={() => open ? (setOpen(false), setSearch('')) : openMenu()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', height: 44, borderRadius: 8, cursor: 'pointer',
          background: '#fff', border: open ? '2px solid #17A2B8' : '1.5px solid #CBD5E1',
          boxShadow: open ? '0 0 0 3px rgba(23,162,184,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
          fontSize: 14, fontWeight: selected ? 600 : 400,
          color: selected ? '#0F172A' : '#9CA3AF',
          transition: 'border 0.15s, box-shadow 0.15s',
          userSelect: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : 'Select a permit type...'}
        </span>
        <i className={`fa fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0, marginLeft: 8 }} />
      </div>
      {menu}
    </div>
  );
}

function toColName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function toTypeValue(name) {
  return 'WORK_PERMIT_' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function toTypeLabel(typeValue) {
  return String(typeValue || '')
    .replace(/^WORK_PERMIT_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function SequenceTab() {
  const [row,     setRow]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const load = () => {
    setLoading(true);
    workPermitService.getSequenceConfig()
      .then(res => {
        const data  = res.data?.data;
        const rows  = Array.isArray(data) ? data : (data ? [data] : []);
        const wpRow = rows.find(r => r.type?.includes('WORK_PERMIT')) || rows[0] || null;
        setRow(wpRow);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = () => {
    setForm({ initial: row?.initial ?? '', size: row?.size ?? '', sequence: row?.sequence ?? '' });
    setError(null);
    setSuccess(false);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setError(null); };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await workPermitService.saveSequenceConfig({
        type:     row.type,
        sub_type: row.sub_type ?? null,
        initial:  form.initial,
        size:     Number(form.size),
        sequence: Number(form.sequence),
      });
      setEditing(false);
      setSuccess(true);
      load();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5 text-muted"><i className="fa fa-circle-o-notch fa-spin me-2" />Loading...</div>;
  }

  if (!row) {
    return (
      <div className="text-center py-5">
        <p className="text-muted small mb-3">No permit number sequence configured yet.</p>
        <button className="btn btn-primary-dark btn-sm" onClick={() => workPermitService.createSequenceConfig({ type: 'WORK_PERMIT' }).then(load)}>
          <i className="fa fa-plus me-1" />Initialize Sequence
        </button>
      </div>
    );
  }

  const preview = `${row.initial || ''}${String(row.sequence ?? 1).padStart(Number(row.size) || 4, '0')}`;

  return (
    <div style={{ maxWidth: 480 }}>
      {error   && <div className="alert alert-danger  py-2 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 small mb-3">Sequence saved successfully.</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between text-white" style={{ background: '#17a2b8' }}>
          <span className="fw-semibold"><i className="fa fa-hashtag me-2" />Work Permit Number</span>
          {!editing && (
            <button className="btn btn-sm btn-light py-0 px-2" style={{ fontSize: 12 }} onClick={startEdit}>
              <i className="fa fa-pencil me-1" />Edit
            </button>
          )}
        </div>
        <div className="card-body">
          {editing ? (
            <div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Prefix</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. WP-"
                  value={form.initial}
                  onChange={e => setForm(p => ({ ...p, initial: e.target.value }))}
                />
                <div className="form-text">Text that appears before the number (e.g. <code>WP-</code>)</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Number Padding</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={1} max={10}
                  value={form.size}
                  onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                />
                <div className="form-text">Minimum digits, padded with zeros (e.g. <code>4</code> → 0001)</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Next Number</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={0}
                  value={form.sequence}
                  onChange={e => setForm(p => ({ ...p, sequence: e.target.value }))}
                />
                <div className="form-text">The next permit will be numbered from this value</div>
              </div>
              <div className="mb-3 p-2 rounded" style={{ background: '#f0fbfd', border: '1px solid #b2e4ed' }}>
                <span className="small text-muted me-2">Preview:</span>
                <span className="fw-bold" style={{ color: '#17a2b8', fontSize: 15 }}>
                  {form.initial}{String(form.sequence ?? 1).padStart(Number(form.size) || 4, '0')}
                </span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-primary-dark btn-sm px-4" onClick={handleSave} disabled={saving}>
                  {saving ? <i className="fa fa-circle-o-notch fa-spin" /> : 'Save'}
                </button>
                <button className="btn btn-link btn-sm text-muted p-0" onClick={cancelEdit} disabled={saving}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">Prefix</span>
                <span className="fw-semibold small">{row.initial || <span className="text-muted">—</span>}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">Number Padding</span>
                <span className="fw-semibold small">{row.size} digits</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">Next Number</span>
                <span className="fw-semibold small">{row.sequence}</span>
              </div>
              <hr className="my-1" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">Next permit will be</span>
                <span className="fw-bold" style={{ color: '#17a2b8', fontSize: 15 }}>{preview}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LevelTable({ levels, flowUuid, onDeleteLevel, onEditLevel, groupName }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  return (
    <div className="mb-0" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sorted.map((lvl, i) => {
        const isLast = i === sorted.length - 1;
        return (
        <div key={lvl.uuid || i} style={{ transition: 'all 0.2s ease-in-out' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
            onMouseEnter={() => setHoveredRow(lvl.uuid)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: '#F3F4F6',
              color: '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}>
              {lvl.level}
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              boxShadow: hoveredRow === lvl.uuid ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#212529', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {lvl.Name || `Level ${lvl.level}`}
                  {i === 0 && (
                    <span style={{ fontSize: 11, background: '#00B8A9', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      First Approver
                    </span>
                  )}
                  {!lvl.role_id && (
                    <span style={{ fontSize: 11, background: '#DC2626', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      Invalid — role required
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {lvl.role_id && (
                    <span><i className="fa fa-users me-1" />{groupName(lvl.role_id) || `#${lvl.role_id}`}</span>
                  )}
                  {lvl.user_id && (
                    <span><i className="fa fa-user me-1" />{lvl.approver_name || `User #${lvl.user_id}`}</span>
                  )}
                  {!lvl.user_id && !lvl.role_id && '—'}
                </div>
              </div>
              <div className="d-flex gap-2" style={{ opacity: hoveredRow === lvl.uuid || !lvl.role_id ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                <button 
                  className="btn btn-sm btn-light text-info p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: 32, height: 32, borderRadius: 6 }}
                  onClick={() => onEditLevel(flowUuid, lvl)} 
                  title="Edit level"
                >
                  <i className="fa fa-pencil" />
                </button>
                {isLast && (
                  <div title="Delete level">
                    <button 
                      className="btn btn-sm btn-light text-danger p-2 d-flex align-items-center justify-content-center"
                      style={{ width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => onDeleteLevel(flowUuid, lvl.uuid)} 
                    >
                      <i className="fa fa-trash" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, margin: '4px 0' }}>
            <div style={{ width: 2, height: 24, background: '#dee2e6' }} />
            <i className="fa fa-chevron-down" style={{ color: '#adb5bd', fontSize: 10, marginTop: '-4px' }} />
          </div>
        </div>
      )})}
    </div>
  );
}

function ApprovalFlowTab() {
  const [flows, setFlows]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [employees, setEmployees]   = useState([]);
  const [groups, setGroups]         = useState([]);
  const [creating, setCreating]     = useState(false);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [newFlowName, setNewFlowName] = useState('Work Permit Approval');
  const [addingLevel, setAddingLevel] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null);
  const [newLevel, setNewLevel]     = useState({ name: '', user_id: '', role_id: '' });
  const [savingLevel, setSavingLevel] = useState(false);
  const [deletingFlow, setDeletingFlow] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [flowSearch, setFlowSearch]   = useState('');
  const [dialog, setDialog]           = useState(null);

  const showDialog = (title, message, onConfirm, opts = {}) =>
    setDialog({ title, message, onConfirm, confirmLabel: opts.confirmLabel || 'Confirm', confirmVariant: opts.confirmVariant || 'danger' });

  useEffect(() => {
    workPermitService.getApprovalFlows()
      .then(r => {
        const raw = r.data?.data || [];
        setFlows(raw.map(row => ({ ...row.n, levels: row.l || [] })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    workPermitService.getApprovalRoles()
      .then(r => {
        const raw = r.data?.data || r.data || [];
        setGroups(Array.isArray(raw)
          ? raw.filter(role => !DISALLOWED_APPROVAL_ROLES.has(normalizeRole(role.name)))
          : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!newLevel.role_id) {
      setEmployees([]);
      return;
    }
    workPermitService.getApprovalUsers(newLevel.role_id)
      .then(r => setEmployees(r.data?.data || []))
      .catch(() => setEmployees([]));
  }, [newLevel.role_id]);

  const employeeOptions = employees.map(e => ({
    value: String(e.id),
    label: `${e.name}${e.designation_name ? ` — ${e.designation_name}` : ''}`,
    searchText: e.name,
  }));

  const groupOptions = groups.map(g => ({
    value: String(g.id),
    label: g.designation_name || g.remarks || g.name,
    searchText: `${g.designation_name || ''} ${g.remarks || ''} ${g.name || ''}`,
  }));
  const groupName = (id) => {
    const group = groups.find(g => String(g.id) === String(id));
    return group?.designation_name || group?.remarks || group?.name;
  };

  const handleCreateFlow = async (e) => {
    e.preventDefault();
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const res = await workPermitService.createApprovalFlow({ Name: newFlowName.trim() });
      const created = res.data?.data;
      if (created) {
        setFlows(prev => [...prev, { ...created, levels: [] }]);
        setSelectedFlow(created.uuid);
      }
      setNewFlowName('Work Permit Approval');
      setShowNewFlow(false);
    } catch {
      showDialog('Error', 'Failed to create approval flow.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFlow = (flowUuid) => {
    showDialog(
      'Delete Approval Flow',
      'Delete this approval flow and all its levels? This cannot be undone.',
      async () => {
        setDialog(null);
        setDeletingFlow(flowUuid);
        try {
          await workPermitService.deleteApprovalFlow(flowUuid);
          setFlows(prev => prev.filter(f => f.uuid !== flowUuid));
          if (selectedFlow === flowUuid) setSelectedFlow(null);
        } catch {
          showDialog('Error', 'Failed to delete flow.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setDeletingFlow(null);
        }
      },
      { confirmLabel: 'Delete', confirmVariant: 'danger' }
    );
  };

  const handleAddLevel = async (flowUuid, e) => {
    e.preventDefault();
    if (!newLevel.role_id) {
      showDialog('Missing Role', 'Please select the role that can approve at this level.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
      return;
    }
    setSavingLevel(true);
    const flow     = flows.find(f => f.uuid === flowUuid);
    const existingLevel = editingLevel
      ? flow?.levels?.find(level => level.uuid === editingLevel)
      : null;
    const levelNum = existingLevel?.level || (flow?.levels?.length || 0) + 1;
    const emp = employees.find(e => String(e.id) === String(newLevel.user_id));
    if (newLevel.user_id && !emp) {
      setSavingLevel(false);
      showDialog('Invalid Approver', 'The preferred approver must belong to the selected site role.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
      return;
    }
    try {
      const payload = {
        approval_uuid: flowUuid, level: levelNum,
        Name: newLevel.name || `Level ${levelNum}`,
        user_id: newLevel.user_id || null, approver_name: emp?.name || '',
        role_id: newLevel.role_id,
      };
      const res = editingLevel
        ? await workPermitService.updateApprovalLevel({ ...payload, uuid: editingLevel })
        : await workPermitService.createApprovalLevel(payload);
      if (res.data?.status === 'error') throw new Error(res.data?.message || 'Failed to save approval level.');
      const created = res.data?.data;
      if (created) {
        setFlows(prev => prev.map(f =>
          f.uuid === flowUuid
            ? {
                ...f,
                levels: editingLevel
                  ? f.levels.map(level => level.uuid === editingLevel ? { ...level, ...created } : level)
                  : [...(f.levels || []), created],
              }
            : f
        ));
      }
      setNewLevel({ name: '', user_id: '', role_id: '' });
      setAddingLevel(null);
      setEditingLevel(null);
    } catch (error) {
      showDialog('Error', error.response?.data?.message || error.message || 'Failed to save approval level.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setSavingLevel(false);
    }
  };

  const handleEditLevel = (flowUuid, level) => {
    setAddingLevel(flowUuid);
    setEditingLevel(level.uuid);
    setNewLevel({
      name: level.Name || '',
      role_id: level.role_id ? String(level.role_id) : '',
      user_id: level.user_id ? String(level.user_id) : '',
    });
  };

  const handleDeleteLevel = (flowUuid, levelUuid) => {
    showDialog('Delete Level', 'Delete this approval level?',
      async () => {
        setDialog(null);
        try {
          await workPermitService.deleteApprovalLevel(levelUuid);
          setFlows(prev => prev.map(f =>
            f.uuid === flowUuid ? { ...f, levels: f.levels.filter(l => l.uuid !== levelUuid) } : f
          ));
        } catch {
          showDialog('Error', 'Failed to delete level.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        }
      },
      { confirmLabel: 'Delete', confirmVariant: 'danger' }
    );
  };

  const filteredFlows = flowSearch.trim()
    ? flows.filter(f => f.Name.toLowerCase().includes(flowSearch.toLowerCase()))
    : flows;

  const selectedFlowData = flows.find(f => f.uuid === selectedFlow) || null;

  if (loading) {
    return <div className="text-center py-5 text-muted"><i className="fa fa-circle-o-notch fa-spin me-2" />Loading...</div>;
  }

  return (
    <>
      <ConfirmDialog
        show={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        confirmVariant={dialog?.confirmVariant}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />
      <div className="setup-two-col">
        <div className="setup-sidebar-col">
          <div className="container-rounded-white d-flex flex-column" style={{ flex: 1, overflow: 'hidden' }}>
            <SidebarList
              title="Approval Flows"
              icon="fa-shield"
              items={filteredFlows.map(f => ({ id: f.uuid, label: f.Name }))}
              selectedId={selectedFlow}
              onSelect={setSelectedFlow}
              onDelete={handleDeleteFlow}
              deletingId={deletingFlow}
              search={flowSearch}
              onSearch={setFlowSearch}
              showAddForm={showNewFlow}
              onAddClick={() => setShowNewFlow(true)}
              addForm={
                <form onSubmit={handleCreateFlow} className="d-flex gap-2 mb-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={newFlowName}
                    onChange={e => setNewFlowName(e.target.value)}
                    placeholder="e.g. Work Permit Approval"
                    required autoFocus
                  />
                  <button type="submit" className="btn btn-primary-dark btn-sm" disabled={creating}>
                    {creating ? <i className="fa fa-circle-o-notch fa-spin" /> : 'Add'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowNewFlow(false)}>
                    <i className="fa fa-times" />
                  </button>
                </form>
              }
              searchPlaceholder="Search flows..."
              emptyText={flowSearch ? `No flows match "${flowSearch}"` : 'No flows yet.'}
            />
          </div>
        </div>

        <div className="setup-content-col">
          <div className="container-rounded-white d-flex flex-column" style={{ flex: 1, overflow: 'hidden' }}>
            {!selectedFlowData ? (
              <div className="text-center text-muted d-flex flex-column align-items-center justify-content-center" style={{ flex: 1 }}>
                <i className="fa fa-hand-o-left fa-2x mb-3 d-block" />
                Select an approval flow to manage its levels
              </div>
            ) : (
              <>
                <div className="d-flex align-items-center justify-content-between border-bottom-primary pb-2 mb-3 flex-shrink-0">
                  <h6 className="fw-bold text-primary-dark mb-0">
                    <i className="fa fa-shield me-2" />{selectedFlowData.Name} — Levels
                  </h6>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 4px' }}>
                  {(!selectedFlowData.levels || selectedFlowData.levels.length === 0) ? (
                    <div className="text-center p-4 border rounded dashed mb-3 bg-light">
                      <p className="text-muted small mb-0">No approval levels yet. Add at least one level to create the workflow.</p>
                    </div>
                  ) : (
                    <LevelTable
                      levels={selectedFlowData.levels}
                      flowUuid={selectedFlowData.uuid}
                      onDeleteLevel={handleDeleteLevel}
                      onEditLevel={handleEditLevel}
                      groupName={groupName}
                    />
                  )}

                  {(() => {
                    const nextLevelNum = (selectedFlowData.levels?.length || 0) + 1;
                    const editedLevel = editingLevel ? selectedFlowData.levels?.find(l => l.uuid === editingLevel) : null;
                    const displayNum = editedLevel ? editedLevel.level : nextLevelNum;
                    
                    if (addingLevel === selectedFlowData.uuid) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'all 0.2s ease-in-out' }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                            background: editedLevel ? '#F3F4F6' : '#FFFFFF',
                            border: editedLevel ? 'none' : '1px dashed #D1D5DB',
                            color: editedLevel ? '#374151' : '#6B7280', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 700,
                            boxShadow: editedLevel ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                          }}>
                            {displayNum}
                          </div>
                          <form onSubmit={(e) => handleAddLevel(selectedFlowData.uuid, e)} style={{ flex: 1, background: '#F3F4F6', padding: '16px', border: '1px solid #D1D5DB', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                            <div className="row g-2 align-items-end">
                              <div className="col-md-4">
                                <label className="form-label fw-semibold small mb-1">Level Name</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={newLevel.name}
                                  onChange={e => setNewLevel(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder={`Level ${displayNum}`}
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold small mb-1">Role <span className="text-danger">*</span></label>
                                <SearchableSelect
                                  options={groupOptions}
                                  value={newLevel.role_id}
                                  onChange={val => setNewLevel(prev => ({ ...prev, role_id: val, user_id: '' }))}
                                  placeholder="Select role"
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-semibold small mb-1">Preferred Approver <span className="text-muted fw-normal">(optional)</span></label>
                                <SearchableSelect
                                  options={employeeOptions}
                                  value={newLevel.user_id}
                                  onChange={val => setNewLevel(prev => ({ ...prev, user_id: val }))}
                                  placeholder={newLevel.role_id ? 'Notify all users in role' : 'Select a role first'}
                                  disabled={!newLevel.role_id}
                                />
                              </div>
                              <div className="col-12 d-flex align-items-center justify-content-between gap-2 mt-2">
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Any user in the role may approve. A preferred approver changes notification routing only.
                                </span>
                                <div className="d-flex gap-2">
                                  <button type="submit" className="btn btn-sm" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 4, padding: '4px 12px', border: 'none', fontWeight: 500 }} disabled={savingLevel || !newLevel.role_id}>
                                    {savingLevel ? <i className="fa fa-circle-o-notch fa-spin" /> : (editingLevel ? 'Save' : 'Add')}
                                  </button>
                                  <button type="button" className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 4, padding: '4px 12px', fontWeight: 500 }}
                                    onClick={() => { setAddingLevel(null); setEditingLevel(null); setNewLevel({ name: '', user_id: '', role_id: '' }); }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </form>
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s ease-in-out' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: '#FFFFFF', border: '1px dashed #D1D5DB',
                          color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700,
                        }}>
                          {nextLevelNum}
                        </div>
                        <div 
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', borderRadius: 8,
                            background: '#FFFFFF',
                            border: '1px dashed #D1D5DB',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => { setEditingLevel(null); setNewLevel({ name: '', user_id: '', role_id: '' }); setAddingLevel(selectedFlowData.uuid); }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.borderColor = '#6B7280'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="fa fa-plus" />
                              Add Approval Level
                            </div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center' }}>
                              Click to configure this step
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const TEMPLATE_VARIABLES = [
  {
    category: 'Permit Details',
    items: [
      { label: 'Sequence No', tag: "{{ $wp['Sequence No'] }}" },
      { label: 'Permit Type', tag: "{{ $wp['Permit Type'] }}" },
      { label: 'Status', tag: "{{ $wp['Status'] }}" },
      { label: 'Priority', tag: "{{ $wp['Priority'] }}" },
      { label: 'Scheduled Date', tag: "{{ $wp['Scheduled Date'] }}" },
      { label: 'Due Date', tag: "{{ $wp['Due Date'] }}" },
      { label: 'Location', tag: "{{ $wp['Location'] }}" },
      { label: 'Asset / Equipment', tag: "{{ $wp['Asset'] }}" },
      { label: 'Description', tag: "{{ $wp['Description'] }}" },
    ]
  },
  {
    category: 'Vendor & Requester',
    items: [
      { label: 'Vendor Name', tag: "{{ $wp['Vendor'] }}" },
      { label: 'Requester Name', tag: "{{ $wp['Requester'] }}" },
      { label: 'Company / Facility', tag: "{{ $company }}" },
    ]
  },
  {
    category: 'Blade Loops & Tables',
    items: [
      { label: 'Approval Levels Loop', tag: "@foreach($approval_levels as $lvl)\n  <tr><td>{{ $lvl['role'] }}</td><td>{{ $lvl['status'] }}</td><td>{{ $lvl['updated_at'] }}</td></tr>\n@endforeach" },
      { label: 'Dynamic Fields Loop', tag: "@foreach($dynamic_fields as $field)\n  <div style=\"margin-bottom: 6px;\"><strong>{{ $field['label'] }}:</strong> {{ $field['value'] }}</div>\n@endforeach" },
    ]
  },
  {
    category: 'Print & Layout Helpers',
    items: [
      { label: 'Page Break', tag: '<div style="page-break-after: always; height: 1px;"></div>' },
      { label: 'Signature Block', tag: '<div style="display: flex; justify-content: space-between; margin-top: 40px;"><div>____________________<br/><small>Requester Signature</small></div><div>____________________<br/><small>Safety Officer Signature</small></div></div>' },
    ]
  }
];

function PdfTemplateTab() {
  const templateEditorRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ name: '', body: '' });
  const [saving, setSaving]       = useState(false);
  const [activating, setActivating] = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [dialog, setDialog]       = useState(null);
  const [previewModal, setPreviewModal] = useState({ show: false, title: '', html: '' });
  const [copiedVar, setCopiedVar] = useState(null);
  const [varSearch, setVarSearch] = useState('');

  const showDialog = (title, message, onConfirm, opts = {}) =>
    setDialog({ title, message, onConfirm, confirmLabel: opts.confirmLabel || 'Confirm', confirmVariant: opts.confirmVariant || 'danger' });

  const ensureSuccess = (response, fallbackMessage) => {
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || fallbackMessage);
    }
    return response.data?.data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await workPermitService.getTemplates();
      const data = ensureSuccess(response, 'Failed to load templates.');
      setTemplates(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      showDialog('Error', error.message || 'Failed to load templates.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setForm({ name: `New Template (${templates.length + 1})`, body: '' }); };
  const startEdit = (t) => { setEditing(t.id); setForm({ name: t.name, body: t.body || '' }); };
  const cancelEdit = () => { setEditing(null); setForm({ name: '', body: '' }); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const currentBody = templateEditorRef.current?.getData() ?? form.body;
    setSaving(true);
    try {
      let response;
      if (editing === 'new') {
        response = await workPermitService.createTemplate({ name: form.name.trim(), body: currentBody });
      } else {
        response = await workPermitService.updateTemplate({ id: editing, name: form.name.trim(), body: currentBody });
      }
      ensureSuccess(response, 'Failed to save template.');
      if (!await load()) return;
      cancelEdit();
    } catch (error) {
      showDialog('Error', error.message || 'Failed to save template.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (t) => {
    if (t.active) return;
    setActivating(t.id);
    try {
      const response = await workPermitService.setTemplateActive(t.id);
      ensureSuccess(response, 'Failed to set active template.');
      await load();
    } catch (error) {
      showDialog('Error', error.message || 'Failed to set active template.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = (t) => {
    showDialog('Delete Template', `Delete "${t.name}"? This cannot be undone.`,
      async () => {
        setDialog(null);
        setDeleting(t.id);
        try {
          const response = await workPermitService.deleteTemplate(t.id);
          ensureSuccess(response, 'Failed to delete template.');
          await load();
        } catch (error) {
          showDialog('Error', error.message || 'Failed to delete template.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setDeleting(null);
        }
      },
      { confirmLabel: 'Delete', confirmVariant: 'danger' }
    );
  };

  const handlePreviewModal = async (templateId, templateName) => {
    try {
      const res = await workPermitService.renderTemplate(templateId);
      const html = ensureSuccess(res, 'Failed to render preview.') || '';
      setPreviewModal({ show: true, title: templateName || 'Template Preview', html });
    } catch (error) {
      showDialog('Error', error.message || 'Failed to render preview.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    }
  };

  const handleInsertVariable = (tag) => {
    if (templateEditorRef.current?.insertHtml) {
      templateEditorRef.current.insertHtml(tag);
    }
    navigator.clipboard?.writeText?.(tag).catch(() => {});
    setCopiedVar(tag);
    setTimeout(() => setCopiedVar(null), 1800);
  };

  const filteredVariableCategories = TEMPLATE_VARIABLES.map(cat => {
    if (!varSearch.trim()) return cat;
    const q = varSearch.toLowerCase();
    const items = cat.items.filter(item =>
      item.label.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)
    );
    return { ...cat, items };
  }).filter(cat => cat.items.length > 0);

  if (loading) {
    return <div className="text-center py-5 text-muted"><i className="fa fa-circle-o-notch fa-spin me-2" />Loading templates...</div>;
  }

  return (
    <div className="pdf-template-wrapper">
      <ConfirmDialog
        show={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        confirmVariant={dialog?.confirmVariant}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />

      {/* In-App PDF Preview Modal */}
      {previewModal.show && (
        <div className="pdf-modal-backdrop" onClick={() => setPreviewModal({ show: false, title: '', html: '' })}>
          <div className="pdf-modal-container" onClick={e => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h5>
                <i className="fa fa-file-pdf-o" />
                <span>{previewModal.title} (Rendered Preview)</span>
              </h5>
              <div className="pdf-modal-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(previewModal.html);
                      win.document.close();
                    }
                  }}
                  title="Open in new window"
                >
                  <i className="fa fa-external-link me-1" />Open in Tab
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setPreviewModal({ show: false, title: '', html: '' })}
                >
                  <i className="fa fa-times" />
                </button>
              </div>
            </div>
            <div className="pdf-modal-body">
              <div
                className="pdf-paper"
                dangerouslySetInnerHTML={{ __html: previewModal.html }}
              />
            </div>
            <div className="pdf-modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setPreviewModal({ show: false, title: '', html: '' })}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {editing ? (
        /* ─── Simplified Two-Column Document Editor Layout ─── */
        <div className="pdf-editor-layout">
          {/* Left Column: Compact Sticky Variables Palette (230px) */}
          <aside className="pdf-variables-sidebar">
            <div className="pdf-sidebar-card">
              <div className="pdf-sidebar-header">
                <div className="pdf-var-title-row">
                  <span className="title">
                    <i className="fa fa-tags" />Variables & Tags
                  </span>
                </div>
                <div className="pdf-var-search-wrap">
                  <i className="fa fa-search pdf-var-search-icon" />
                  <input
                    type="text"
                    className="form-control form-control-sm pdf-var-search-input"
                    placeholder="Search tags..."
                    value={varSearch}
                    onChange={e => setVarSearch(e.target.value)}
                  />
                  {varSearch && (
                    <button className="btn btn-sm btn-link p-0 text-muted pdf-var-search-clear" onClick={() => setVarSearch('')}>
                      <i className="fa fa-times" />
                    </button>
                  )}
                </div>
              </div>

              <div className="pdf-sidebar-scroll">
                {filteredVariableCategories.length === 0 ? (
                  <div className="text-center py-3 text-muted small" style={{ fontSize: 11 }}>
                    No tags match "{varSearch}"
                  </div>
                ) : (
                  filteredVariableCategories.map(cat => (
                    <div key={cat.category} className="pdf-var-group">
                      <div className="pdf-var-group-title">
                        <span>{cat.category}</span>
                        <span className="count">{cat.items.length}</span>
                      </div>
                      <div className="pdf-var-group-items">
                        {cat.items.map(item => (
                          <button
                            type="button"
                            key={item.label}
                            className={`pdf-var-item-btn ${copiedVar === item.tag ? 'copied' : ''}`}
                            onClick={() => handleInsertVariable(item.tag)}
                            title={`Click to insert: ${item.tag}`}
                          >
                            <div className="pdf-var-label-row">
                              <span className="pdf-var-name">{item.label}</span>
                              {copiedVar === item.tag ? (
                                <span className="badge bg-success" style={{ fontSize: 8.5 }}><i className="fa fa-check me-1" />Added</span>
                              ) : (
                                <span className="pdf-insert-hint"><i className="fa fa-plus-circle" /></span>
                              )}
                            </div>
                            <div className="pdf-var-code-snippet">{item.tag.length > 30 ? item.tag.substring(0, 30) + '...' : item.tag}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <div className="pdf-sidebar-guide">
                  <div className="guide-title"><i className="fa fa-lightbulb-o text-warning me-1" />Editor Tip</div>
                  <div className="guide-text">
                    Use <strong>Source</strong> in toolbar to edit Blade directives (<code>@foreach</code>, <code>@if</code>) and custom HTML tables.
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Large Primary Document Editor Canvas */}
          <main className="pdf-editor-main-canvas">
            {/* Single Clean Top Action Bar */}
            <div className="pdf-canvas-top-bar">
              <div className="pdf-name-field-wrap">
                <label className="pdf-field-label">Template Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Standard Work Permit Template"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="pdf-canvas-actions">
                {editing !== 'new' && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handlePreviewModal(editing, form.name)}
                  >
                    <i className="fa fa-eye me-1" />Preview Document
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary-dark btn-sm"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                >
                  {saving ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Saving...</> : <><i className="fa fa-check me-1" />Save Template</>}
                </button>
              </div>
            </div>

            {/* Direct Full-Width CKEditor Area */}
            <div className="pdf-ckeditor-direct-wrapper">
              <CkEditor4
                ref={templateEditorRef}
                value={form.body}
                autoGrow={true}
                minHeight={650}
                onChange={body => setForm(prev => ({ ...prev, body }))}
                disabled={saving}
              />
            </div>
          </main>
        </div>
      ) : (
        /* ─── Template List View ─── */
        <>
          <div className="pdf-template-header-card">
            <div className="pdf-template-title-area">
              <div className="pdf-icon-badge">
                <i className="fa fa-file-pdf-o" />
              </div>
              <div>
                <h6>Work Permit PDF Templates</h6>
                <div className="pdf-template-sub">Configure and customize PDF export layouts using HTML and dynamic Blade-style data placeholders</div>
              </div>
            </div>
            <button type="button" className="btn btn-primary-dark btn-sm" onClick={startNew}>
              <i className="fa fa-plus me-1" />Add Template
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="pdf-table-card text-center py-5 text-muted">
              <i className="fa fa-file-text-o fa-3x mb-3 d-block text-muted" />
              <h6>No PDF Templates Configured</h6>
              <p className="small mb-3">Add a template to customize generated Work Permit printable PDFs.</p>
              <button type="button" className="btn btn-primary-dark btn-sm" onClick={startNew}>
                <i className="fa fa-plus me-1" />Create First Template
              </button>
            </div>
          ) : (
            <div className="pdf-table-card">
              <div className="table-responsive">
                <table className="pdf-template-table">
                  <thead>
                    <tr>
                      <th>Template Name</th>
                      <th className="text-center" style={{ width: 140 }}>Status</th>
                      <th className="text-end" style={{ width: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div className="fw-bold text-dark">{t.name}</div>
                          <div className="small text-muted">ID: {t.id}</div>
                        </td>
                        <td className="text-center">
                          {t.active ? (
                            <span className="pdf-active-pill">
                              <span className="dot" />Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="pdf-set-active-btn"
                              onClick={() => handleActivate(t)}
                              disabled={activating === t.id}
                            >
                              {activating === t.id ? <i className="fa fa-circle-o-notch fa-spin me-1" /> : null}
                              Set Active
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              type="button"
                              className="pdf-action-btn preview"
                              onClick={() => handlePreviewModal(t.id, t.name)}
                              title="Preview in Modal"
                            >
                              <i className="fa fa-eye" />
                            </button>
                            <button
                              type="button"
                              className="pdf-action-btn edit"
                              onClick={() => startEdit(t)}
                              title="Edit Template"
                            >
                              <i className="fa fa-pencil" />
                            </button>
                            <button
                              type="button"
                              className="pdf-action-btn delete"
                              onClick={() => handleDelete(t)}
                              disabled={deleting === t.id}
                              title="Delete Template"
                            >
                              {deleting === t.id ? <i className="fa fa-circle-o-notch fa-spin" /> : <i className="fa fa-trash" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OptionsManager({ options = [], onChange }) {
  const [newOpt, setNewOpt] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 4 }}>
            <span style={{ fontSize: 12.5, color: '#0F172A' }}>{opt}</span>
            <div style={{ display: 'flex', gap: 4 }}>
               <button type="button" className="btn btn-sm p-0" style={{ width: 22, height: 22, color: '#64748B' }} onClick={() => {
                 if (i > 0) {
                   const val = [...options];
                   [val[i-1], val[i]] = [val[i], val[i-1]];
                   onChange(val);
                 }
               }}><i className="fa fa-arrow-up" style={{ fontSize: 10 }} /></button>
               <button type="button" className="btn btn-sm p-0" style={{ width: 22, height: 22, color: '#64748B' }} onClick={() => {
                 if (i < options.length - 1) {
                   const val = [...options];
                   [val[i+1], val[i]] = [val[i], val[i+1]];
                   onChange(val);
                 }
               }}><i className="fa fa-arrow-down" style={{ fontSize: 10 }} /></button>
               <button type="button" className="btn btn-sm p-0" style={{ width: 22, height: 22, color: '#DC2626' }} onClick={() => {
                 const val = [...options];
                 val.splice(i, 1);
                 onChange(val);
               }}><i className="fa fa-times" style={{ fontSize: 10 }} /></button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input 
          type="text" 
          className="form-control form-control-sm" 
          style={{ height: 28, borderRadius: 4, fontSize: 12 }} 
          value={newOpt} 
          onChange={e => setNewOpt(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newOpt.trim()) { onChange([...options, newOpt.trim()]); setNewOpt(''); } } }}
          placeholder="Add an option..." 
        />
        <button 
          type="button" 
          className="btn btn-sm btn-outline-primary" 
          style={{ height: 28, padding: '0 10px', fontSize: 11, borderRadius: 4, whiteSpace: 'nowrap' }} 
          onClick={() => { if (newOpt.trim()) { onChange([...options, newOpt.trim()]); setNewOpt(''); } }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function Setup() {
  const { siteId } = useParams();
  const [tab, setTab] = useState('types');


  const [siteForms, setSiteForms]         = useState([]);
  const [selectedType, setSelectedType]   = useState(null);
  const [fields, setFields]               = useState([]);
  const [showAddField, setShowAddField]   = useState(false);
  const [newField, setNewField]           = useState(EMPTY_FIELD);
  const [saving, setSaving]               = useState(false);
  const [activating, setActivating]       = useState(null);
  const [deleting, setDeleting]           = useState(null);
  const [showAddType, setShowAddType]     = useState(false);
  const [newTypeName, setNewTypeName]     = useState('');
  const [addingType, setAddingType]       = useState(false);
  const [editingField, setEditingField]   = useState(null);
  const [editValues, setEditValues]       = useState({});
  const [savingEdit, setSavingEdit]       = useState(false);
  const [hoveredField, setHoveredField]   = useState(null);
  const [dialog, setDialog]              = useState(null);
  const [typeSearch, setTypeSearch]       = useState('');
  const editFormRef                       = useRef(null);

  const showDialog = (title, message, onConfirm, opts = {}) =>
    setDialog({ title, message, onConfirm, confirmLabel: opts.confirmLabel || 'Confirm', confirmVariant: opts.confirmVariant || 'danger' });

  useEffect(() => {
    formService.getForms()
      .then(res => setSiteForms(res.data?.data || []))
      .catch(() => {});
  }, [siteId]);

  useEffect(() => {
    if (!selectedType) return;
    setShowAddField(false);
    setEditingField(null);
    const form = siteForms.find(f => (f.tag || f.type) === selectedType);
    setFields(form?.fields || []);
  }, [selectedType, siteForms]);

  const getSiteForm = (typeValue) => siteForms.find(f => (f.tag || f.type) === typeValue);
  const isActive    = (typeValue) => {
    const form = getSiteForm(typeValue);
    return form ? (form.is_enable === 1 || form.is_enable === true) : false;
  };

  const allTypes = siteForms
    .filter(f => f.tag || f.type)
    .map(f => ({ label: f.name || toTypeLabel(f.tag || f.type), value: f.tag || f.type }));

  const filteredTypes = typeSearch.trim()
    ? allTypes.filter(t => t.label.toLowerCase().includes(typeSearch.toLowerCase()))
    : allTypes;

  const getTypeLabel = (typeValue) => allTypes.find(t => t.value === typeValue)?.label || typeValue;

  const handleSelectType = async (typeValue) => {
    const existingForm = getSiteForm(typeValue);
    if (isActive(typeValue) || (existingForm && existingForm.is_enable == null)) {
      setSelectedType(typeValue);
      return;
    }
    setActivating(typeValue);
    try {
      if (existingForm) {
        await formService.updateForm({
          id: existingForm.id,
          form_id: existingForm.id,
          name: existingForm.name,
          form_name: existingForm.name,
          tag: existingForm.tag,
          is_enable: 1,
        });
        setSiteForms(prev => prev.map(f => f.id === existingForm.id ? { ...f, is_enable: 1 } : f));
        setSelectedType(typeValue);
      }
    } catch {
      showDialog('Error', 'Failed to activate permit type.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setActivating(null);
    }
  };

  const handleDeleteType = (typeValue) => {
    const form = getSiteForm(typeValue);
    if (!form) return;
    showDialog(
      'Delete Permit Type',
      'Delete this permit type? This cannot be undone.',
      async () => {
        setDialog(null);
        setDeleting(typeValue);
        try {
          await formService.deleteForm(form.id);
          setSiteForms(prev => prev.filter(f => f.id !== form.id));
          if (selectedType === typeValue) setSelectedType(null);
        } catch {
          showDialog('Error', 'Failed to delete permit type.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setDeleting(null);
        }
      },
      { confirmLabel: 'Delete', confirmVariant: 'danger' }
    );
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const res = await formService.addForm({
        name: newTypeName.trim(), type: 'WORK_PERMIT',
        tag: toTypeValue(newTypeName.trim()), is_enable: 1,
      });
      const created = res.data?.data;
      if (created) { setSiteForms(prev => [...prev, created]); setSelectedType(created.tag || created.type); }
      setNewTypeName('');
      setShowAddType(false);
    } catch {
      showDialog('Error', 'Failed to add permit type.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setAddingType(false);
    }
  };

  const handleDeleteField = (fieldId) => {
    showDialog('Delete Field', 'Delete this field? This cannot be undone.',
      async () => {
        setDialog(null);
        try {
          await formService.deleteField(fieldId);
          setFields(prev => prev.filter(f => f.id !== fieldId));
          setSiteForms(prev => prev.map(form => (form.tag || form.type) === selectedType ? { ...form, fields: (form.fields || []).filter(f => f.id !== fieldId) } : form));
        } catch {
          showDialog('Error', 'Failed to delete field.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        }
      },
      { confirmLabel: 'Delete', confirmVariant: 'danger' }
    );
  };

  const startEditField = (f) => {
    setShowAddField(false);
    const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
    let parsedOptions = [];
    try {
      parsedOptions = typeof f.option === 'string' ? JSON.parse(f.option) : (f.option || []);
    } catch(e) {}
    if (!Array.isArray(parsedOptions)) parsedOptions = [];

    setEditingField(f.id);
    setEditValues({
      name: f.name,
      type: f.type || 'text',
      placeholder: fieldData.placeholder || '',
      is_required: !!fieldData.is_required,
      is_multi_select: !!fieldData.is_multi_select,
      options: parsedOptions
    });
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSaveEdit = async (f) => {
    setSavingEdit(true);
    try {
      const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
      const updatedDataObj = { ...fieldData, placeholder: editValues.placeholder, is_required: editValues.is_required, is_multi_select: editValues.is_multi_select };
      const optionsJson = editValues.type === 'select' ? JSON.stringify(editValues.options) : null;
      
      await formService.updateField({
        id:       f.id,
        name:     editValues.name,
        col_name: f.col_name,
        type:     editValues.type,
        data:     JSON.stringify(updatedDataObj),
        option:   optionsJson,
      });
      setFields(prev => prev.map(field => field.id === f.id
        ? { ...field, name: editValues.name, type: editValues.type, data: JSON.stringify(updatedDataObj), option: optionsJson }
        : field
      ));
      setEditingField(null);
    } catch {
      showDialog('Error', 'Failed to update field.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleRequired = async (f) => {
    const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
    const newRequired = !fieldData.is_required;
    try {
      await formService.updateField({
        id:       f.id,
        name:     f.name,
        col_name: f.col_name,
        type:     f.type,
        data:     JSON.stringify({ ...fieldData, is_required: newRequired }),
      });
      setFields(prev => prev.map(field =>
        field.id === f.id
          ? { ...field, data: JSON.stringify({ ...fieldData, is_required: newRequired }) }
          : field
      ));
    } catch {
      showDialog('Error', 'Failed to update field.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const siteForm = getSiteForm(selectedType);
      const data = {
        name: newField.name,
        col_name: newField.col_name || toColName(newField.name),
        type: newField.type,
        form_id: siteForm?.id,
        form_type: 'WORK_PERMIT',
        form_tag: selectedType,
        is_enable: true,
        data: JSON.stringify({ tag: 'work_permit', is_required: newField.is_required, placeholder: newField.placeholder, is_multi_select: newField.is_multi_select }),
        option: newField.type === 'select' && newField.options
          ? JSON.stringify(newField.options)
          : null,
      };
      const res = await formService.addField(data);
      const created = res.data?.data;
      if (created) {
        setFields(prev => [...prev, created]);
        setSiteForms(prev => prev.map(f =>
          (f.tag || f.type) === selectedType
            ? { ...f, fields: [...(f.fields || []), created] }
            : f
        ));
      }
      setNewField(EMPTY_FIELD);
      setShowAddField(false);
    } catch {
      showDialog('Error', 'Failed to add field.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`setup-outer wp-page ${tab === 'pdf' ? 'setup-pdf-mode' : ''}`} style={{ padding: '4px 16px 16px' }}>
      <ConfirmDialog
        show={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        confirmVariant={dialog?.confirmVariant}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .setup-tab-bar { display: flex; gap: 2px; margin-bottom: 16px; border-bottom: 2px solid #E5E7EB; padding-bottom: 0; overflow-x: auto; flex-shrink: 0; scrollbar-width: none; -ms-overflow-style: none; }
        .setup-tab-bar::-webkit-scrollbar { display: none; }
        .setup-two-col { display: flex; gap: 16px; flex: 1; min-height: 0; }
        .setup-sidebar-col { flex-shrink: 0; width: 33%; display: flex; flex-direction: column; min-width: 0; }
        .setup-content-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .setup-outer { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        /* Mobile permit selector hidden by default (shown via media query) */
        .mobile-permit-select { display: none; }
        /* Desktop table — fixed layout keeps columns stable; Type column won't squeeze */
        .fields-table-wrap table { table-layout: auto; }

        @media (max-width: 768px) {
          .setup-outer { height: auto !important; overflow-y: auto !important; min-height: 0 !important; }
          /* On mobile the two-col layout becomes single-column, sidebar hidden */
          .setup-two-col { flex-direction: column !important; overflow-y: visible !important; flex: none !important; min-height: 0 !important; }
          .setup-sidebar-col { display: none !important; }
          .setup-content-col { min-height: 0 !important; flex: none !important; width: 100% !important; }
          .setup-tab-bar button { padding: 7px 10px !important; font-size: 11.5px !important; }
          .setup-tab-bar button i { display: none !important; }
          /* Fields table → stacked cards */
          .fields-table-wrap { display: none !important; }
          .fields-cards-wrap { display: flex !important; }
          /* Show mobile permit selector */
          .mobile-permit-select { display: block !important; }
          /* Ensure card padding and prevent dropdown clipping on mobile */
          .container-rounded-white { padding: 16px !important; overflow: visible !important; }
        }
        @media (min-width: 769px) {
          .fields-table-wrap { display: block !important; }
          .fields-cards-wrap { display: none !important; }
          .mobile-permit-select { display: none !important; }
        }
      `}</style>
      {/* Setup Heading Removed */}

      <div className="setup-tab-bar">
        {[
          { key: 'types',    icon: 'fa-file-text', label: 'Work Permit Types' },
          { key: 'approval', icon: 'fa-shield',    label: 'Approval Flow' },
          { key: 'sequence', icon: 'fa-hashtag',   label: 'Permit Numbering' },
          { key: 'pdf',      icon: 'fa-file-pdf-o', label: 'PDF Template' },
        ].map(t => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                background: isActive ? '#17A2B8' : 'transparent',
                color: isActive ? '#fff' : '#6B7280',
                border: 'none',
                borderBottom: isActive ? '2px solid #17A2B8' : '2px solid transparent',
                borderRadius: '6px 6px 0 0',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: -2,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = '#F9FAFB'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'transparent'; } }}
            >
              <i className={`fa ${t.icon}`} style={{ fontSize: 12 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: tab === 'pdf' ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column' }}>
      {tab === 'sequence' && (
        <div className="container-rounded-white">
          <SequenceTab />
        </div>
      )}

      {tab === 'approval' && <ApprovalFlowTab />}

      {tab === 'pdf' && <PdfTemplateTab />}

      {tab === 'types' && (
        <div className="setup-two-col">
          <div className="setup-sidebar-col">
            <div className="container-rounded-white d-flex flex-column" style={{ flex: 1, overflow: 'hidden' }}>
              <SidebarList
                title="Permit Types"
                icon="fa-list"
                items={filteredTypes.map(pt => ({ id: pt.value, label: pt.label }))}
                selectedId={selectedType}
                onSelect={handleSelectType}
                onDelete={handleDeleteType}
                isDeletable={id => !!getSiteForm(id)}
                deletingId={deleting}
                activatingId={activating}
                search={typeSearch}
                onSearch={setTypeSearch}
                showAddForm={showAddType}
                onAddClick={() => setShowAddType(true)}
                addForm={
                  <form onSubmit={handleAddType} className="d-flex gap-2 mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={newTypeName}
                      onChange={e => setNewTypeName(e.target.value)}
                      placeholder="e.g. Radiation Work"
                      autoFocus required
                    />
                    <button type="submit" className="btn btn-primary-dark btn-sm" disabled={addingType}>
                      {addingType ? <i className="fa fa-circle-o-notch fa-spin" /> : 'Add'}
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setShowAddType(false); setNewTypeName(''); }}>
                      <i className="fa fa-times" />
                    </button>
                  </form>
                }
                searchPlaceholder="Search types..."
                emptyText={typeSearch ? `No types match "${typeSearch}"` : 'No types yet.'}
              />
            </div>
          </div>

          <div className="setup-content-col">
            <div className="container-rounded-white d-flex flex-column" style={{ flex: 1, overflow: 'hidden' }}>
              {/* Mobile-only permit type selector — hidden on desktop via CSS */}
              <div className="mobile-permit-select">
                <MobilePermitTypeSelect
                  types={allTypes}
                  selectedId={selectedType}
                  onSelect={handleSelectType}
                  activatingId={activating}
                  deleting={deleting}
                />
              </div>
              {!selectedType ? (
                <div className="text-center text-muted d-flex flex-column align-items-center justify-content-center" style={{ flex: 1, minHeight: 120 }}>
                  <i className="fa fa-list fa-2x mb-3 d-block" />
                  Select a permit type to manage its fields
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2.5 mb-3 flex-shrink-0">
                    <div>
                      <h5 className="fw-bold text-dark mb-0" style={{ fontSize: 15, letterSpacing: '-0.01em', color: '#0F172A' }}>
                        <i className={editingField ? "fa fa-pencil me-2" : "fa fa-list-alt me-2"} style={{ color: '#17A2B8' }} />
                        {editingField ? 'Edit Field' : `${getTypeLabel(selectedType)} — Fields`}
                      </h5>
                    </div>
                    {(!showAddField && !editingField) && (
                      <button
                        className="btn btn-sm"
                        style={{
                          height: 32,
                          padding: '0 12px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          borderRadius: 4,
                          background: '#0066CC',
                          color: '#FFFFFF',
                          border: 'none',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setEditingField(null);
                          setShowAddField(true);
                          setTimeout(() => {
                            editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        }}
                      >
                        <i className="fa fa-plus" style={{ fontSize: 11 }} />
                        Add Field
                      </button>
                    )}
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
                  {(showAddField || editingField) && (
                    <form ref={editFormRef} onSubmit={e => {
                      e.preventDefault();
                      if (editingField) {
                        handleSaveEdit(fields.find(f => f.id === editingField));
                      } else {
                        handleAddField(e);
                      }
                    }} className="rounded-3 p-3 mb-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-dark" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#475569' }}>
                          {editingField ? 'Edit Field' : 'Add New Field'}
                        </span>
                      </div>

                      <div className="row g-3 mb-2">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold mb-1" style={{ fontSize: 11.5, color: '#475569' }}>
                            Field Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ height: 32, borderRadius: 5, border: '1px solid #CBD5E1', fontSize: 13, color: '#0F172A' }}
                            value={editingField ? editValues.name : newField.name}
                            onChange={e => {
                              if (editingField) setEditValues(p => ({ ...p, name: e.target.value }));
                              else setNewField(p => ({ ...p, name: e.target.value, col_name: toColName(e.target.value) }));
                            }}
                            placeholder="e.g. Working Height"
                            required
                            autoFocus
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold mb-1" style={{ fontSize: 11.5, color: '#475569' }}>
                            Type <span className="text-danger">*</span>
                          </label>
                          <div>
                            <FieldTypePicker 
                              value={editingField ? editValues.type : newField.type} 
                              onChange={v => {
                                if (editingField) setEditValues(p => ({ ...p, type: v }));
                                else setNewField(p => ({ ...p, type: v }));
                              }} 
                            />
                          </div>
                        </div>

                        {(editingField ? editValues.type : newField.type) === 'select' && (
                          <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: 11.5, color: '#475569' }}>
                              Selection Type
                            </label>
                            <div style={{ display: 'flex', background: '#E2E8F0', padding: 3, borderRadius: 6, width: 'fit-content' }}>
                              {(() => {
                                const isMulti = editingField ? editValues.is_multi_select : newField.is_multi_select;
                                const setMulti = val => {
                                  if (editingField) setEditValues(p => ({ ...p, is_multi_select: val }));
                                  else setNewField(p => ({ ...p, is_multi_select: val }));
                                };
                                return (
                                  <>
                                    <div onClick={() => setMulti(false)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, color: !isMulti ? '#0F172A' : '#64748B', background: !isMulti ? '#fff' : 'transparent', borderRadius: 4, cursor: 'pointer', boxShadow: !isMulti ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Single Select</div>
                                    <div onClick={() => setMulti(true)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, color: isMulti ? '#0F172A' : '#64748B', background: isMulti ? '#fff' : 'transparent', borderRadius: 4, cursor: 'pointer', boxShadow: isMulti ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Multi Select</div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        <div className="col-12 col-md-6 d-flex align-items-end">
                          <label className="d-flex align-items-center gap-2 px-3 py-1 border rounded" style={{ cursor: 'pointer', borderColor: '#CBD5E1', height: 32, background: '#fff', margin: 0, width: 'max-content' }}>
                            <input 
                              type="checkbox" 
                              className="form-check-input mt-0" 
                              style={{ cursor: 'pointer', width: 14, height: 14 }} 
                              checked={editingField ? editValues.is_required : newField.is_required} 
                              onChange={(e) => {
                                if (editingField) setEditValues(p => ({ ...p, is_required: e.target.checked }));
                                else setNewField(p => ({ ...p, is_required: e.target.checked }));
                              }} 
                            />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Required Field</span>
                          </label>
                        </div>

                        {(editingField ? editValues.type : newField.type) !== 'checkbox' && (
                          <div className="col-12">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: 11.5, color: '#475569' }}>Placeholder</label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ height: 32, borderRadius: 5, border: '1px solid #CBD5E1', fontSize: 12.5, color: '#0F172A' }}
                              value={editingField ? editValues.placeholder : newField.placeholder}
                              onChange={e => {
                                if (editingField) setEditValues(p => ({ ...p, placeholder: e.target.value }));
                                else setNewField(p => ({ ...p, placeholder: e.target.value }));
                              }}
                              placeholder="Optional placeholder"
                            />
                          </div>
                        )}

                        {(editingField ? editValues.type : newField.type) === 'select' && (
                          <div className="col-12">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: 11.5, color: '#475569' }}>Options <span className="text-danger">*</span></label>
                            <OptionsManager 
                              options={editingField ? editValues.options : newField.options} 
                              onChange={opts => {
                                if (editingField) setEditValues(p => ({ ...p, options: opts }));
                                else setNewField(p => ({ ...p, options: opts }));
                              }} 
                            />
                          </div>
                        )}
                      </div>

                      <div className="d-flex align-items-center justify-content-end pt-3 mt-1 border-top flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            style={{ height: 30, padding: '0 12px', fontSize: 12, borderRadius: 5 }}
                            onClick={() => { setShowAddField(false); setEditingField(null); }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-sm"
                            style={{
                              height: 30,
                              padding: '0 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 4,
                              background: '#0066CC',
                              color: '#FFFFFF',
                              border: 'none',
                            }}
                            disabled={editingField ? savingEdit : saving}
                          >
                            {(editingField ? savingEdit : saving) ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Saving...</> : (editingField ? 'Save Changes' : 'Save Field')}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {fields.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8' }}>
                      <i className="fa fa-list-alt" style={{ fontSize: 28, marginBottom: 8, display: 'block', color: '#CBD5E1' }} />
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155', marginBottom: 2 }}>No fields configured</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>Add fields to collect specific information for this permit type.</div>
                    </div>
                  ) : (
                    <div style={{ transition: 'opacity 0.2s' }}>
                    {/* ── Desktop table (hidden on mobile via CSS) ── */}
                    <div className="fields-table-wrap table-responsive hide-scrollbar" style={{ border: '1px solid #D1D5DB', borderRadius: 8, overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: 40 }} />
                          <col />{/* Field Name — takes remaining space */}
                          <col style={{ width: 200 }} />
                          <col style={{ width: 110 }} />
                          <col style={{ width: 100 }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>#</th>
                            <th style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>Field Name</th>
                            <th style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>Type</th>
                            <th style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', textAlign: 'center' }}>Required</th>
                            <th style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((f, i) => {
                            const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
                            const isGlobal  = f.society_id === 0;
                            const isEditing = editingField === f.id;
                            const isHovered = hoveredField === f.id;

                            return (
                              <tr
                                key={f.id}
                                style={{ borderBottom: i < fields.length - 1 ? '1px solid #F1F5F9' : 'none', transition: 'background 0.12s ease', backgroundColor: 'transparent' }}
                                onMouseEnter={e => { setHoveredField(f.id); e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                                onMouseLeave={e => { setHoveredField(null); e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 13, fontWeight: 500, verticalAlign: 'middle' }}>{i + 1}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13.5, color: '#0F172A', cursor: isGlobal ? undefined : 'pointer', verticalAlign: 'middle' }} onClick={isGlobal ? undefined : () => startEditField(f)} title={isGlobal ? undefined : 'Click to edit'}>
                                  {f.name}
                                  {isGlobal && <i className="fa fa-lock ms-2" style={{ fontSize: 11, color: '#94A3B8' }} title="System field (read-only)" />}
                                </td>
                                <td style={{ padding: '12px 16px', cursor: isGlobal ? undefined : 'pointer', verticalAlign: 'middle' }} onClick={isGlobal ? undefined : () => startEditField(f)} title={isGlobal ? undefined : 'Click to edit'}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
                                    <i className={`fa ${FIELD_TYPES.find(t => t.value === f.type)?.icon || 'fa-font'}`} style={{ fontSize: 10, color: '#64748B' }} />
                                    {f.type}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', cursor: isGlobal ? undefined : 'pointer', verticalAlign: 'middle' }} onClick={isGlobal ? undefined : () => handleToggleRequired(f)} title={isGlobal ? undefined : 'Click to toggle required'}>
                                  {fieldData.is_required ? (
                                    <i className="fa fa-check-circle" style={{ fontSize: 18, color: '#10B981' }} title="Required" />
                                  ) : (
                                    <i className="fa fa-circle-thin" style={{ fontSize: 18, color: '#CBD5E1' }} title="Optional" />
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                  {!isGlobal && (
                                    <div className="d-flex align-items-center justify-content-end gap-2">
                                      <button className="btn btn-sm btn-link p-1 text-secondary text-decoration-none" style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s ease', fontSize: 13 }} onClick={() => startEditField(f)} title="Edit field">
                                        <i className="fa fa-pencil" style={{ color: '#64748B' }} />
                                      </button>
                                      <button className="btn btn-sm text-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, opacity: isHovered ? 1 : 0, transition: 'all 0.15s ease', fontSize: 16, borderRadius: 4 }} onClick={() => handleDeleteField(f.id)} title="Delete field" onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                        <i className="fa fa-trash-o" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Mobile stacked cards (hidden on desktop via CSS) ── */}
                    <div className="fields-cards-wrap" style={{ flexDirection: 'column', gap: 8 }}>
                      {fields.map((f, i) => {
                        const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
                        const isGlobal  = f.society_id === 0;
                        const isEditing = editingField === f.id;
                        const typeInfo  = FIELD_TYPES.find(t => t.value === f.type);
                        return (
                          <div key={f.id} style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            background: '#fff',
                            overflow: 'hidden',
                          }}>
                              {/* ── View state ── */}
                              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10 }}>
                                {/* Row number */}
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#CBD5E1', flexShrink: 0, width: 18, textAlign: 'center' }}>{i + 1}</span>
                                {/* Field info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.name}
                                    {isGlobal && <i className="fa fa-lock ms-1" style={{ fontSize: 10, color: '#CBD5E1' }} title="System field" />}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    {/* Type badge — matches desktop exactly */}
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
                                      <i className={`fa ${typeInfo?.icon || 'fa-font'}`} style={{ fontSize: 9, color: '#64748B' }} />
                                      {f.type}
                                    </span>
                                    {/* Required indicator — matches desktop icon style */}
                                    {fieldData.is_required ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#10B981' }}>
                                        <i className="fa fa-check-circle" style={{ fontSize: 11 }} />Required
                                      </span>
                                    ) : (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#CBD5E1' }}>
                                        <i className="fa fa-circle-thin" style={{ fontSize: 11 }} />Optional
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Compact icon actions */}
                                {!isGlobal && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    <button
                                      className="btn btn-sm"
                                      style={{ width: 30, height: 30, padding: 0, borderRadius: 4, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      onClick={() => startEditField(f)}
                                      title="Edit"
                                    >
                                      <i className="fa fa-pencil" style={{ fontSize: 11 }} />
                                    </button>
                                    <button
                                      className="btn btn-sm"
                                      style={{ width: 30, height: 30, padding: 0, borderRadius: 4, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      onClick={() => handleDeleteField(f.id)}
                                      title="Delete"
                                    >
                                      <i className="fa fa-trash-o" style={{ fontSize: 11 }} />
                                    </button>
                                  </div>
                                )}
                              </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
