import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workPermitService from '@/services/workPermitService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useApp } from '@/context/AppContext';
import { formatDuration } from '@/utils/duration';
import { getStatusStyle } from '@/utils/statusStyle';

const STATUS_STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
];

const DECLINED_STATUSES = ['DECLINED', 'REQUEST_CHANGE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];

// Display metadata for _uh history entries (node-level status history, same {s,t,u}
// convention as Workorder/HK/LB) — every status change lands here in order.
const HISTORY_STATUS_META = {
  DRAFT: { label: 'Draft', icon: 'fa-file-text-o' },
  PENDING: { label: 'Sent for Approval', icon: 'fa-paper-plane' },
  APPROVED: { label: 'Approved', icon: 'fa-check' },
  ACTIVE: { label: 'Activated', icon: 'fa-play' },
  COMPLETED: { label: 'Completed', icon: 'fa-check-circle' },
  SUSPENDED: { label: 'Suspended', icon: 'fa-pause' },
  CANCELLED: { label: 'Cancelled', icon: 'fa-ban' },
  DECLINED: { label: 'Declined', icon: 'fa-times' },
  REQUEST_CHANGE: { label: 'Change Requested', icon: 'fa-undo' },
  EXPIRED: { label: 'Expired', icon: 'fa-clock-o' },
};

// Backend may return a host-relative url (host not configured server-side) — resolve it
// against the given app's base URL so it doesn't get treated as relative to this app.
function resolveAppUrl(url, base) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return (base || '').replace(/\/$/, '') + url;
}

const resolveGatePassUrl = (url) => resolveAppUrl(url, import.meta.env.VITE_GATE_PASS_APP_URL);
const resolveWorkPermitUrl = (url) => resolveAppUrl(url, `${window.location.origin}${import.meta.env.BASE_URL}`);
const resolveMaterialPassUrl = () => `${window.location.origin}/vms/#/app/material-pass`;


function Field({ label, value, span }) {
  return (
    <div className={`wp-field${span ? ' span-2' : ''}`}>
      <div className="wp-field-label">{label}:</div>
      <div className={`wp-field-value${value ? '' : ' muted'}`}>{value || 'Not added'}</div>
    </div>
  );
}

function fmtTs(ts) {
  if (!ts) return null;
  const iso = typeof ts === 'string' && !ts.includes('T') ? ts.replace(' ', 'T') + 'Z' : ts;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toLocalDatetimeInput(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getPermitDueTimestamp(permit) {
  const dueAtUtc = Number(permit?.due_at_utc);
  if (dueAtUtc > 0) return dueAtUtc > 1e12 ? dueAtUtc : dueAtUtc * 1000;
  if (!permit?.['Due Date']) return null;
  const parsed = new Date(String(permit['Due Date']).replace(' ', 'T'));
  return isNaN(parsed) ? null : parsed.getTime();
}

function StatusTimeline({ status, permit }) {
  const uh = permit?._uh;
  if (Array.isArray(uh) && uh.length > 0) {
    return <HistoryTimeline uh={uh} />;
  }
  // Graceful fallback for permits created before _uh existed.
  return <LegacyStatusTimeline status={status} permit={permit} />;
}

function HistoryTimeline({ uh }) {
  const entries = uh.slice().sort((a, b) => (b.t || '').localeCompare(a.t || '')); // latest on top

  return (
    <div className="container-rounded-white wp-card" >
      <div className="wp-card-head"><i className="fa fa-history" />Activity History</div>

      <div className="wp-vstepper">
        {entries.map((e, idx) => {
          const meta = HISTORY_STATUS_META[e.s] || { label: (e.s || '').replace(/_/g, ' '), icon: 'fa-circle' };
          const isLatest = idx === 0;

          return (
            <div key={idx} className={`wp-vstep done${isLatest ? ' current' : ''}`}>
              <div className="wp-vstep-track">
                <div className="wp-step-circle" style={getStatusStyle(e.s, 'bg')}>
                  <i className={`fa ${meta.icon}`} style={{ fontSize: 11 }} />
                </div>
                {idx < entries.length - 1 && <div className="wp-vstep-line done" />}
              </div>
              <div className="wp-vstep-body">
                <div className="wp-vstep-label">
                  {meta.label}
                  {isLatest && <span className="wp-current-pill">Current</span>}
                </div>
                {e.t && (
                  <div className="wp-vstep-sub">
                    <span className="fw-semibold">{fmtTs(e.t)}</span>
                    {e.count > 1 && <span className="ms-1 text-muted">· {e.count} people</span>}
                  </div>
                )}
                {e.actor && <div className="wp-vstep-sub text-muted">by {e.actor}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegacyStatusTimeline({ status, permit }) {
  const isDeclined = DECLINED_STATUSES.includes(status);
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);

  const levels = permit?.approval_levels || [];
  const approveAct = levels.map(l => l.action).find(a => a?.status === 'APPROVE')
    || (permit?.actions || []).find(a => a?.status === 'APPROVE');
  const timestamps = {
    DRAFT: fmtTs(permit?.created_at),
    PENDING: fmtTs(permit?.submitted_at || permit?.raised_at),
    APPROVED: fmtTs(approveAct?.updated_at || approveAct?.created_at),
    ACTIVE: fmtTs(permit?.activated_at),
    COMPLETED: fmtTs(permit?.completed_at || (status === 'COMPLETED' ? permit?.updated_at : null)),
  };
  const actors = {
    ACTIVE: permit?.activated_by_name ? `by ${permit.activated_by_name}` : null,
    COMPLETED: permit?.completed_by_name ? `by ${permit.completed_by_name}` : null,
  };
  const futureHints = {
    ACTIVE: 'Starts on check-in',
    COMPLETED: permit?.['Due Date'] ? `Due ${fmtDateShort(permit['Due Date'])}` : null,
  };

  return (
    <div className="container-rounded-white wp-card" >
      <div className="wp-card-head"><i className="fa fa-clock-o" />Activity History</div>

      {isDeclined && (
        <span className="status-badge d-inline-block mb-4" style={{ fontSize: 11, ...getStatusStyle(status, 'bg') }}>
          {status.replace(/_/g, ' ')}
        </span>
      )}

      <div className="d-flex flex-column" style={{ gap: '16px', paddingLeft: '8px' }}>
        {STATUS_STEPS.map((step, idx) => {
          const isDone = !isDeclined && currentIdx > idx;
          const isCurrent = step.key === status && !isDeclined;
          const isFuture = !isDone && !isCurrent;
          const ts = (isDone || isCurrent) ? timestamps[step.key] : null;
          const actor = (isDone || isCurrent) ? actors[step.key] : null;

          if (isFuture) return null; // Reference only shows past/current activities

          return (
            <div key={step.key} className="d-flex" style={{ gap: '16px' }}>
              <div className="d-flex flex-column align-items-center mt-1">
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isCurrent ? '#10B981' : '#D1D5DB', flexShrink: 0 }} />
                {idx > 0 && <div style={{ width: '2px', flex: 1, background: '#E5E7EB', margin: '4px 0', minHeight: '32px' }} />}
              </div>
              <div style={{ paddingBottom: '0' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B4A54' }}>
                  {step.label}
                </div>
                {(ts || actor) && (
                  <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '2px' }}>
                    {ts && <span>{ts}</span>}
                    {actor && <span> by {actor}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        }).reverse()}
      </div>
    </div>
  );
}

function ActionModal({ show, onClose, onSubmit, loading, levelName, approvalBlocked = false }) {
  const [action, setAction] = useState(null);
  const [comment, setComment] = useState('');

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((action === 'DECLINE' && !comment.trim()) || (action === 'APPROVE' && approvalBlocked)) return;
    onSubmit({ action, comment });
    setComment('');
  };

  const actionConfig = [
    { key: 'APPROVE', label: 'Approve', icon: 'fa-check', colorClass: 'btn-success', outlineClass: 'btn-outline-success' },
    { key: 'DECLINE', label: 'Decline', icon: 'fa-times', colorClass: 'btn-danger', outlineClass: 'btn-outline-danger' },
    { key: 'REQUEST_CHANGE', label: 'Request Change', icon: 'fa-undo', colorClass: 'btn-warning', outlineClass: 'btn-outline-warning' },
  ];

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-0">Take Action</h5>
              {levelName && <small className="text-muted">{levelName}</small>}
            </div>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {approvalBlocked && (
                <div className="alert alert-warning py-2 small">
                  The due date has passed. Approval is blocked; request a time change instead.
                </div>
              )}
              <div className="mb-3 d-flex gap-2">
                {actionConfig.map(item => {
                  const isSelected = action === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`btn btn-sm ${isSelected ? `${item.colorClass} active` : item.outlineClass}`}
                      onClick={() => setAction(item.key)}
                      disabled={item.key === 'APPROVE' && approvalBlocked}
                      style={{
                        fontWeight: 600,
                        color: isSelected ? '#ffffff' : undefined,
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      <i className={`fa ${item.icon} me-1`} style={{ color: isSelected ? '#ffffff' : undefined }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Comment{action === 'DECLINE' ? ' (required)' : ''}</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={action === 'DECLINE' ? 'Enter the rejection reason' : 'Add a comment (optional)'}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary-dark btn-sm" disabled={loading || !action || (action === 'DECLINE' && !comment.trim()) || (action === 'APPROVE' && approvalBlocked)}>
                {loading ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Processing...</> : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ApprovalFlowPanel({ approvalLevels, permitStatus, extensionApprovalStatus, onAction, actionLoad, loggedInUser, approvalBlocked }) {
  const [activeLevel, setActiveLevel] = useState(null);

  if (!approvalLevels || approvalLevels.length === 0) {
    return <p className="text-muted small mb-0">No approval flow configured for this site.</p>;
  }

  const currentLevelIdx = approvalLevels.findIndex(r => !r.action);
  const isComplete = currentLevelIdx === -1;

  const levelStatusColor = (act) => {
    if (!act) return '#dee2e6';
    if (act.status === 'APPROVE') return '#10B981';
    if (act.status === 'DECLINE') return '#DC2626';
    return '#F59E0B';
  };

  const levelRowClass = (act, isCurrent) => {
    if (act?.status === 'APPROVE') return 'is-approved';
    if (act?.status === 'DECLINE') return 'is-declined';
    if (isCurrent) return 'is-current';
    return '';
  };

  const levelStatusBadge = (act, idx) => {
    if (!act) {
      return idx === currentLevelIdx && (permitStatus === 'PENDING' || (permitStatus === 'EXPIRED' && extensionApprovalStatus === 'PENDING'))
        ? <span className="wp-badge-approved" style={{ background: '#17A2B8' }}>Pending</span>
        : <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>Waiting</span>;
    }
    if (act.status === 'APPROVE') return <span className="wp-badge-approved" style={{ background: '#10B981' }}>Approved</span>;
    if (act.status === 'DECLINE') return <span className="wp-badge-approved" style={{ background: '#DC2626' }}>Declined</span>;
    if (act.status === 'REQUEST_CHANGE') return <span className="wp-badge-approved" style={{ background: '#F59E0B' }}>Change Req.</span>;
    return <span className="badge bg-secondary" style={{ fontSize: 10 }}>{act.status}</span>;
  };

  return (
    <>
      <ActionModal
        show={!!activeLevel}
        onClose={() => setActiveLevel(null)}
        onSubmit={({ action, comment }) => {
          onAction(activeLevel.flow?.uuid, activeLevel.level?.uuid, activeLevel.level?.Name, action, comment);
          setActiveLevel(null);
        }}
        loading={actionLoad}
        levelName={activeLevel?.level?.Name}
        approvalBlocked={approvalBlocked}
      />

      <div className="d-flex flex-column gap-3 mt-1">
        {approvalLevels.map((row, idx) => {
          const lvl = row.level || {};
          const act = row.action || null;
          const isCurrent = idx === currentLevelIdx && (permitStatus === 'PENDING' || (permitStatus === 'EXPIRED' && extensionApprovalStatus === 'PENDING'));

          return (
            <div key={lvl.uuid || idx} className={`wp-approval-row ${levelRowClass(act, isCurrent)}`}>
              <div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="wp-approval-row-title">
                      L{lvl.level} — {lvl.Name || `Level ${lvl.level}`}
                    </div>
                    <div className="wp-approval-row-sub">
                      {lvl.user_id
                        ? `${lvl.approver_name || `User #${lvl.user_id}`}`
                        : (lvl.role_id ? 'Assigned Role' : '—')}
                      {act?.updated_at && ` · ${new Date(act.updated_at.includes('T') ? act.updated_at : act.updated_at.replace(' ', 'T') + 'Z').toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}`}
                    </div>
                  </div>
                  {levelStatusBadge(act, idx)}
                </div>

                {act?.comment && (
                  <div className="wp-approval-comment">
                    "{act.comment}"
                  </div>
                )}

                {isCurrent && (
                  <div className="mt-3">
                    {lvl.role_id && String(lvl.role_id) === String(loggedInUser?.role_id) ? (
                      <button
                        className="btn w-100"
                        style={{ fontSize: 13, padding: '8px 12px', fontWeight: 600, background: '#2563EB', borderColor: '#2563EB', color: '#fff', borderRadius: '6px' }}
                        onClick={() => setActiveLevel(row)}
                        disabled={actionLoad}
                      >
                        Take Action
                      </button>
                    ) : (
                      <div className="text-muted text-center" style={{ fontSize: 11.5, background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: 4 }}>
                        <i className="fa fa-lock me-1" />Awaiting assigned approver
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isComplete && approvalLevels.length > 0 && (
          <div className="wp-all-done mt-1">
            <i className="fa fa-check-circle" />All approval levels completed
          </div>
        )}
      </div>
    </>
  );
}

function SimpleActionPanel({ permitStatus, extensionApprovalStatus, onAction, actionLoad, approvalBlocked }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <ActionModal
        show={show}
        onClose={() => setShow(false)}
        onSubmit={({ action, comment }) => { onAction(null, null, null, action, comment); setShow(false); }}
        loading={actionLoad}
        approvalBlocked={approvalBlocked}
      />
      {(permitStatus === 'PENDING' || (permitStatus === 'EXPIRED' && extensionApprovalStatus === 'PENDING')) && (
        <button className="btn btn-primary-dark btn-sm" onClick={() => setShow(true)} disabled={actionLoad}>
          <i className="fa fa-check me-1" />Take Action
        </button>
      )}
    </>
  );
}

function ItemSearchField({ value, label, stock, onSelect }) {
  const [query, setQuery] = useState(label || '');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { setQuery(label || ''); }, [label]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = (text) => {
    setLoading(true);
    workPermitService.searchItems(text)
      .then(res => setOptions(res.data?.data || []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  };

  const handleInput = (e) => {
    const text = e.target.value;
    setQuery(text);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 300);
  };

  const handleFocus = () => {
    setOpen(true);
    if (options.length === 0) runSearch(query);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 2 }}>
      <input
        className="form-control form-control-sm"
        placeholder="Search item..."
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
      />
      {value && stock !== null && stock !== undefined && (
        <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
          <i className="fa fa-cubes me-1" />Stock: {stock}
        </div>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #dee2e6', borderRadius: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
        }}>
          {loading ? (
            <div className="text-muted text-center py-2" style={{ fontSize: 12 }}>
              <i className="fa fa-circle-o-notch fa-spin me-1" />Searching...
            </div>
          ) : options.length === 0 ? (
            <div className="text-muted text-center py-2" style={{ fontSize: 12 }}>No items found</div>
          ) : (
            options.map(opt => (
              <div
                key={opt.uuid}
                onClick={() => { onSelect(opt); setQuery(opt.Name || ''); setOpen(false); }}
                style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.Name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MaterialGatePassPanel({ wpUuid, canRaise }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [direction, setDirection] = useState('OUT');
  const [type, setType] = useState('NON_RETURNABLE');
  const [items, setItems] = useState([{ item_uuid: '', item_name: '', qty: '', description: '', stock: null }]);

  const load = () => {
    setLoading(true);
    workPermitService.getMaterialGatePasses(wpUuid)
      .then(res => setPasses(res.data?.data || []))
      .catch(() => setPasses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [wpUuid]);

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
  const addItemRow = () => setItems(prev => [...prev, { item_uuid: '', item_name: '', qty: '', description: '', stock: null }]);
  const removeItemRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const selectItem = (idx, opt) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, item_uuid: opt.uuid, item_name: opt.Name || '', stock: null } : it));
    workPermitService.getItemStock(opt.uuid)
      .then(res => {
        const rows = res.data?.data || [];
        const total = rows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0);
        setItems(prev => prev.map((it, i) => i === idx && it.item_uuid === opt.uuid ? { ...it, stock: total } : it));
      })
      .catch(() => { });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanItems = items.filter(it => it.item_uuid);
    if (direction === 'OUT' && cleanItems.some(it => it.stock != null && Number(it.qty) > it.stock)) {
      setError('Quantity exceeds available stock for one or more items.');
      return;
    }

    setSaving(true);
    try {
      const res = await workPermitService.createMaterialGatePass(wpUuid, { direction, type, items: cleanItems });
      if (res.data?.status === false) {
        setError(res.data?.message || 'Failed to raise material gate pass.');
        return;
      }
      setShowForm(false);
      setItems([{ item_uuid: '', item_name: '', qty: '', description: '', stock: null }]);
      load();
    } catch {
      setError('Failed to raise material gate pass.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-rounded-white" >
      <div className="d-flex align-items-center justify-content-between wp-card-head" style={{ marginBottom: 12 }}>
        <span><i className="fa fa-cubes" /> Material Gate Pass</span>
        {canRaise && (
          <button className="btn btn-outline-primary btn-sm" style={{ fontSize: 11 }} onClick={() => setShowForm(s => !s)}>
            <i className="fa fa-plus me-1" />Raise Pass
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-3 p-2" style={{ background: '#f8f9fa', borderRadius: 6 }}>
          <div className="d-flex gap-2 mb-2">
            <select className="form-select form-select-sm" value={direction} onChange={e => setDirection(e.target.value)}>
              <option value="OUT">OUT</option>
              <option value="IN">IN</option>
            </select>
            <select className="form-select form-select-sm" value={type} onChange={e => setType(e.target.value)}>
              <option value="NON_RETURNABLE">Non-Returnable</option>
              <option value="RETURNABLE">Returnable</option>
            </select>
          </div>

          {items.map((it, idx) => (
            <div className="d-flex gap-1 mb-1" style={{ alignItems: 'flex-start' }} key={idx}>
              <ItemSearchField value={it.item_uuid} label={it.item_name} stock={it.stock} onSelect={opt => selectItem(idx, opt)} />
              <div style={{ flex: 1 }}>
                {(() => {
                  const overStock = direction === 'OUT' && it.stock != null && Number(it.qty) > it.stock;
                  return (
                    <>
                      <input
                        type="number" min={1}
                        className={`form-control form-control-sm${overStock ? ' is-invalid' : ''}`}
                        placeholder="Qty" value={it.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                      />
                      {overStock && (
                        <div className="text-danger" style={{ fontSize: 10, marginTop: 2 }}>Max {it.stock}</div>
                      )}
                    </>
                  );
                })()}
              </div>
              <input className="form-control form-control-sm" placeholder="Description" value={it.description}
                onChange={e => updateItem(idx, 'description', e.target.value)} style={{ flex: 2 }} />
              {items.length > 1 && (
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeItemRow(idx)}>
                  <i className="fa fa-times" />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-link btn-sm p-0 mb-2" onClick={addItemRow}>
            <i className="fa fa-plus me-1" />Add item
          </button>

          {error && <div className="text-danger small mb-2">{error}</div>}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary-dark btn-sm" disabled={saving || (direction === 'OUT' && items.some(it => it.stock != null && Number(it.qty) > it.stock))}>
              {saving ? <i className="fa fa-circle-o-notch fa-spin" /> : 'Submit'}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted small mb-0">Loading...</p>
      ) : passes.length === 0 ? (
        <p className="text-muted small mb-0">No material gate passes raised yet.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {passes.map(gp => (
            <div key={gp.uuid} className="wp-gp-row" style={{ borderColor: gp.passType === 'returnable' ? '#F59E0B' : '#adb5bd' }}>
              {gp.qr_code_url && (
                <a href={resolveGatePassUrl(gp.qr_code_url)} target="_blank" rel="noopener noreferrer" className="wp-qr-box wp-gp-qr" title="Open gate pass QR">
                  <img src={resolveGatePassUrl(gp.qr_code_url)} alt="Gate Pass QR" />
                </a>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="d-flex justify-content-between align-items-start">
                  <span className="fw-semibold small">
                    <i className={`fa fa-arrow-${gp.EntryorExit === 'In' ? 'down' : 'up'} me-1`} />
                    {(gp.EntryorExit || '').toUpperCase()} · {gp.passType === 'returnable' ? 'Returnable' : 'Non-Returnable'}
                  </span>
                  {gp.status === 'RELEASED' ? (
                    <span className="wp-visitor-badge on-site"><i className="fa fa-check-circle me-1" />Confirmed</span>
                  ) : ['DRAFT', 'PENDING', 'APPROVED'].includes(gp.status) ? (
                    <span className="wp-visitor-badge"><i className="fa fa-clock-o me-1" />Awaiting Gate Confirmation</span>
                  ) : (
                    <span className="status-badge" style={{ fontSize: 10, ...getStatusStyle(gp.status, 'bg') }}>{gp.status}</span>
                  )}
                </div>
                <div className="fw-semibold" style={{ fontSize: 12.5, color: '#0B4A54' }}>
                  {gp['Sequence No'] || '—'}
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {[
                    gp.vendor_name,
                    gp.item_count ? `${gp.item_count} item${gp.item_count === 1 ? '' : 's'}` : null,
                    gp['Date Created'],
                  ].filter(Boolean).join(' · ')}
                </div>
                {gp.gp_url && (
                  <a href={resolveGatePassUrl(gp.gp_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11 }}>
                    <i className="fa fa-external-link me-1" />View Gate Pass
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkPermitDetail() {
  const { siteId, sequence } = useParams();
  const navigate = useNavigate();
  const { loggedInUser, permitTypes } = useApp();

  const typeLabel = (val) => permitTypes.find(t => t.value === val)?.label || val || '—';

  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoad, setActionLoad] = useState(false);
  const [statusLoad, setStatusLoad] = useState(false);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [pdfLoad, setPdfLoad] = useState(false);
  const [emailLoad, setEmailLoad] = useState(false);
  const [promptValue, setPromptValue] = useState('1');
  const promptValueRef = useRef('1');

  const updatePromptValue = (v) => {
    promptValueRef.current = v;
    setPromptValue(v);
  };

  const load = () => {
    setLoading(true);
    workPermitService.getBySequence(sequence)
      .then(res => {
        const data = res.data?.data || null;
        setPermit(data);
      })
      .catch(() => setError('Failed to load work permit.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sequence]);

  const id = permit?.uuid;

  const showDialog = (title, message, onConfirm, opts = {}) =>
    setDialog({ title, message, onConfirm, confirmLabel: opts.confirmLabel || 'Confirm', confirmVariant: opts.confirmVariant || 'danger' });

  const ensureSuccess = (res) => {
    if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Action failed');
    return res;
  };

  const handleAction = async (approvalUuid, levelUuid, levelName, action, comment) => {
    setActionLoad(true);
    try {
      ensureSuccess(await workPermitService.actionApproval({
        uuid: id,
        action,
        comment,
        approval_uuid: approvalUuid || undefined,
        level_uuid: levelUuid || undefined,
      }));
      load();
    } catch (e) {
      load();
      showDialog('Action Failed', e.message || 'Failed to process action. Please try again.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setActionLoad(false);
    }
  };

  const handleComplete = () => {
    showDialog(
      'Mark as Completed',
      'Mark this work permit as Completed? This confirms the work is done.',
      async () => {
        setDialog(null);
        setStatusLoad(true);
        try {
          const res = await workPermitService.complete(id);
          if (res.data?.status !== 'success') {
            showDialog('Cannot Close Permit', res.data?.message || 'Failed to complete work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
            return;
          }
          load();
        } catch {
          showDialog('Error', 'Failed to update status.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setStatusLoad(false);
        }
      },
      { confirmLabel: 'Mark Completed', confirmVariant: 'success' }
    );
  };

  const handleActivate = () => {
    showDialog(
      'Activate Work Permit',
      'Activate this approved work permit? The first valid check-in will also activate it automatically.',
      async () => {
        setDialog(null);
        setStatusLoad(true);
        try {
          ensureSuccess(await workPermitService.activate(id));
          load();
        } catch (e) {
          showDialog('Cannot Activate Permit', e.message || 'Failed to activate work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setStatusLoad(false);
        }
      },
      { confirmLabel: 'Activate', confirmVariant: 'success' }
    );
  };

  const showPromptDialog = ({ title, message = null, label, type = 'text', min, allowedMinutes, initialValue = '', confirmLabel, confirmVariant = 'primary', validate, onSubmit }) => {
    updatePromptValue(initialValue);
    setDialog({
      title,
      message,
      confirmLabel,
      confirmVariant,
      inputConfig: { label, type, min, allowedMinutes },
      onConfirm: () => {
        const value = promptValueRef.current;
        const err = validate?.(value);
        if (err) {
          showDialog('Error', err, () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
          return;
        }
        setDialog(null);
        onSubmit(value);
      },
    });
  };

  const handleSuspend = () => {
    showPromptDialog({
      title: 'Suspend Work Permit',
      message: 'Suspend this work permit? A reason is required.',
      label: 'Reason',
      confirmLabel: 'Suspend',
      confirmVariant: 'warning',
      validate: (reason) => !reason.trim() ? 'Enter a suspension reason.' : null,
      onSubmit: (reason) => {
        setStatusLoad(true);
        workPermitService.suspend(id, reason)
          .then(ensureSuccess).then(load)
          .catch((e) => showDialog('Error', e.message || 'Failed to suspend work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' }))
          .finally(() => setStatusLoad(false));
      },
    });
  };

  const handleResume = () => {
    setStatusLoad(true);
    workPermitService.resume(id)
      .then(ensureSuccess).then(load)
      .catch((e) => showDialog('Error', e.message || 'Failed to resume work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' }))
      .finally(() => setStatusLoad(false));
  };

  const handleCancel = () => {
    showPromptDialog({
      title: 'Cancel Work Permit',
      message: 'Cancel this work permit? This cannot be undone. A reason is required.',
      label: 'Reason',
      confirmLabel: 'Cancel Permit',
      confirmVariant: 'danger',
      validate: (reason) => !reason.trim() ? 'Enter a cancellation reason.' : null,
      onSubmit: (reason) => {
        setStatusLoad(true);
        workPermitService.cancel(id, reason)
          .then(ensureSuccess).then(load)
          .catch((e) => showDialog('Error', e.message || 'Failed to cancel work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' }))
          .finally(() => setStatusLoad(false));
      },
    });
  };

  const handleExtend = () => {
    const rawDueDate = permit?.['Due Date'] ? String(permit['Due Date']) : null;
    const parsedDate = rawDueDate ? new Date(rawDueDate.replace(' ', 'T')) : null;
    const oldDate = parsedDate && !isNaN(parsedDate) ? parsedDate : new Date();
    const now = new Date();
    const baseline = oldDate > now ? oldDate : now;
    const minValue = toLocalDatetimeInput(baseline);
    const dueMinute = String(oldDate.getMinutes()).padStart(2, '0');
    const initialDate = new Date(baseline);
    initialDate.setSeconds(0, 0);
    initialDate.setMinutes(oldDate.getMinutes());
    if (initialDate <= baseline) initialDate.setHours(initialDate.getHours() + 1);

    showPromptDialog({
      title: 'Extend Work Permit',
      message: 'Set a requested due date and time. The permit remains Expired until final approval.',
      label: 'New due date & time',
      type: 'datetime-select',
      min: minValue,
      allowedMinutes: [dueMinute],
      initialValue: toLocalDatetimeInput(initialDate),
      confirmLabel: 'Extend',
      confirmVariant: 'success',
      validate: (value) => {
        const newDate = value ? new Date(value) : null;
        if (!value || isNaN(newDate) || newDate <= oldDate || newDate <= new Date()) {
          return 'Enter a future due date/time after the current due date.';
        }
        return (newDate.getTime() - oldDate.getTime()) % 3600000 !== 0
          ? 'Extend the permit by a whole number of hours.'
          : null;
      },
      onSubmit: (value) => {
        showPromptDialog({
          title: 'Extension Reason',
          message: 'Explain why this extension is needed.',
          label: 'Reason',
          confirmLabel: 'Request Extension',
          validate: (reason) => !reason.trim() ? 'Enter an extension reason.' : null,
          onSubmit: (reason) => {
            setStatusLoad(true);
            workPermitService.extend(id, value, reason)
              .then((res) => {
                if (res.data?.status !== 'success') {
                  showDialog('Cannot Extend Permit', res.data?.message || 'Failed to extend work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
                  return;
                }
                load();
              })
              .catch(() => showDialog('Error', 'Failed to extend work permit.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' }))
              .finally(() => setStatusLoad(false));
          },
        });
      },
    });
  };

  const handleSendForApproval = () => {
    showDialog(
      'Send for Approval',
      'Send this work permit for approval? It will move to Pending.',
      async () => {
        setDialog(null);
        setStatusLoad(true);
        try {
          await workPermitService.sendForApproval(id);
          load();
        } catch {
          showDialog('Error', 'Failed to send for approval.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setStatusLoad(false);
        }
      },
      { confirmLabel: 'Send for Approval', confirmVariant: 'success' }
    );
  };

  const handlePreviewPdf = async () => {
    setPdfLoad(true);
    try {
      const res = await workPermitService.generatePdf(id, 1);
      if (res.data?.status === 'success') {
        window.open(res.data.data, '_blank');
      } else {
        showDialog('Error', res.data?.message || 'Failed to render PDF.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
      }
    } catch {
      showDialog('Error', 'Failed to render PDF.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setPdfLoad(false);
    }
  };

  const handleGeneratePdf = async () => {
    setPdfLoad(true);
    try {
      const res = await workPermitService.generatePdf(id, 0);
      if (res.data?.status === 'success') {
        load();
      } else {
        showDialog('Error', res.data?.message || 'Failed to generate PDF.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
      }
    } catch {
      showDialog('Error', 'Failed to generate PDF.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    } finally {
      setPdfLoad(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!permit?.pdf_url) return;
    const link = document.createElement('a');
    link.href = permit.pdf_url;
    link.target = '_blank';
    link.setAttribute('download', permit['Sequence No'] || 'work-permit');
    link.click();
  };

  const handleShareEmail = () => {
    if (!permit?.pdf_url) return;
    showPromptDialog({
      title: 'Share PDF via Email',
      label: 'Recipient email',
      type: 'email',
      initialValue: permit.vendor_email || '',
      confirmLabel: 'Send',
      validate: (v) => (!v ? 'Enter a recipient email address.' : null),
      onSubmit: async (recipient) => {
        setEmailLoad(true);
        try {
          await workPermitService.emailPdf(id, permit.pdf_url, [recipient]);
          showDialog('Sent', 'PDF emailed successfully.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } catch {
          showDialog('Error', 'Failed to email PDF.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
        } finally {
          setEmailLoad(false);
        }
      },
    });
  };

  const handleShareWhatsApp = () => {
    if (!permit?.pdf_url) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(`Work Permit ${permit['Sequence No'] || ''}: ${permit.pdf_url}`), '_blank');
  };

  if (loading) {
    return (
      <div className="wp-page container-rounded-white">
        <div className="wp-empty-state">
          <i className="fa fa-circle-o-notch fa-spin" />
          <div className="wp-state-title">Loading work permit…</div>
        </div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="wp-page container-rounded-white">
        <div className="wp-error-state">
          <i className="fa fa-exclamation-triangle" />
          <div className="wp-state-title">{error || 'Work permit not found.'}</div>
          <div className="wp-state-sub mb-3">The permit may have been removed or the link is incorrect.</div>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
            <i className="fa fa-arrow-left me-1" />Go Back
          </button>
        </div>
      </div>
    );
  }

  const status = permit.status || 'DRAFT';
  const isOwner = String(permit.created_by) === String(loggedInUser?.id);
  const isBackendUser = String(loggedInUser?.designation_name || '').trim().toLowerCase() === 'backend';
  const finalLevel = permit.approval_levels?.[permit.approval_levels.length - 1]?.level;
  const isFinalApprover = finalLevel?.role_id && String(finalLevel.role_id) === String(loggedInUser?.role_id);
  const hasLifecycleAuthority = isOwner || isFinalApprover || isBackendUser;
  const canActivate = hasLifecycleAuthority && status === 'APPROVED';
  const canComplete = hasLifecycleAuthority && status === 'ACTIVE';
  const canSuspend = hasLifecycleAuthority && status === 'ACTIVE';
  const canResume = hasLifecycleAuthority && status === 'SUSPENDED';
  const canCancel = hasLifecycleAuthority && ['DRAFT', 'PENDING', 'REQUEST_CHANGE', 'APPROVED'].includes(status);
  const canExtend = hasLifecycleAuthority && status === 'EXPIRED' && permit.extension_approval_status !== 'PENDING';
  const canEdit = isOwner && ['DRAFT', 'REQUEST_CHANGE'].includes(status);
  const canSendForApproval = isOwner && status === 'DRAFT';
  const canGeneratePdf = ['APPROVED', 'ACTIVE', 'COMPLETED'].includes(status);
  const canPreviewPdf = status !== 'DRAFT';
  const hasFlow = permit.approval_levels && permit.approval_levels.length > 0;
  const dueTimestamp = getPermitDueTimestamp(permit);
  const approvalBlocked = status === 'PENDING' && dueTimestamp !== null && dueTimestamp <= Date.now();
  const scheduledDate = permit['Scheduled Date'] || permit.start_date;
  const scheduledAt = scheduledDate
    ? (/\d{1,2}:\d{2}/.test(String(scheduledDate)) || !permit.start_time
      ? String(scheduledDate)
      : `${scheduledDate} ${permit.start_time}`)
    : null;
  const dynamicFields = permit.dynamic_fields && typeof permit.dynamic_fields === 'object'
    ? Object.entries(permit.dynamic_fields)
    : [];
  const approvalActions = (permit.actions || []).filter(
    action => String(action.status || '').toUpperCase() !== 'EXPIRED'
  );

  return (
    <div className="wp-page">
      <ConfirmDialog
        show={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        confirmVariant={dialog?.confirmVariant}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
        inputConfig={dialog?.inputConfig && {
          ...dialog.inputConfig,
          value: promptValue,
          onChange: updatePromptValue,
        }}
      />

      <div className="wp-header-wrapper">
        <div className="wp-header">
          <div className="wp-header-left">
            <div className="wp-header-icon"><i className="fa fa-file-text-o" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>
                WORK PERMIT · {typeLabel(permit.type).toUpperCase()}
              </div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h4 className="wp-header-title mb-0" style={{ fontSize: '16px', fontWeight: 700, color: '#0B4A54', wordBreak: 'break-word' }}>
                  {permit["Sequence No"]} · {permit.asset_name || permit.location_name}
                </h4>
                {permit.priority && (
                  <span className="status-badge" style={{ fontSize: 9.5, background: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {permit.priority.toUpperCase()} PRIORITY
                  </span>
                )}
                <span className="status-badge" style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap', ...getStatusStyle(status, 'bg') }}>
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="wp-header-sub text-truncate" style={{ fontSize: '12px', color: '#6b7280' }}>
                {permit.description || 'No description provided'} · Vendor: {permit.vendor_name} ({permit.no_of_personnels} Personnel)
              </div>
            </div>
          </div>
          <div className="wp-header-right">
            {canActivate && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={handleActivate}
                disabled={statusLoad}
                title="Activate Work Permit"
              >
                <i className="fa fa-play me-1" /> Activate
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={handleComplete}
                disabled={statusLoad}
                title="Mark as Completed"
              >
                <i className="fa fa-check-circle me-1" /> Mark Completed
              </button>
            )}
            {canSuspend && (
              <button
                type="button"
                className="btn btn-outline-warning btn-sm"
                onClick={handleSuspend}
                disabled={statusLoad}
                title="Suspend Work Permit"
              >
                <i className="fa fa-pause me-1" /> Suspend
              </button>
            )}
            {canResume && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={handleResume}
                disabled={statusLoad}
                title="Resume Work Permit"
              >
                <i className="fa fa-play me-1" /> Resume
              </button>
            )}
            {canExtend && (
              <button
                type="button"
                className="btn btn-outline-info btn-sm"
                onClick={handleExtend}
                disabled={statusLoad}
                title="Extend Work Permit"
              >
                <i className="fa fa-clock-o me-1" /> Extend
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleCancel}
                disabled={statusLoad}
                title="Cancel Work Permit"
              >
                <i className="fa fa-times-circle me-1" /> Cancel Permit
              </button>
            )}

            {canPreviewPdf && (
              <div className="d-flex align-items-center gap-2" style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '12px', marginLeft: '4px' }}>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={permit.pdf_url ? handlePreviewPdf : handleGeneratePdf}
                  disabled={pdfLoad}
                >
                  {pdfLoad ? <i className="fa fa-circle-o-notch fa-spin me-1" /> : <i className="fa fa-print me-1" />} Print PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {(canEdit || canSendForApproval) && (
          <div className="wp-header-toolbar">
            <div className="wp-actions-bar">
              {canEdit && (
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`/site/${siteId}/work-permit/${sequence}/edit`)}>
                  <i className="fa fa-pencil me-1" />Edit
                </button>
              )}
              {canSendForApproval && (
                <button className="btn btn-primary-dark btn-sm" onClick={handleSendForApproval} disabled={statusLoad}>
                  <i className="fa fa-paper-plane me-1" />Send for Approval
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {approvalBlocked && (
        <div className="wp-warning-banner">
          <div className="wp-warning-text">
            <i className="fa fa-exclamation-circle" />
            <span>
              <strong>Schedule Extended / Expired:</strong> The scheduled due date ({permit['Due Date']}) has passed. Standard approval is locked until a new work timeframe is requested.
            </span>
          </div>
          {canExtend && (
            <button className="btn btn-primary" style={{ background: '#2563EB', borderColor: '#2563EB', color: '#fff', fontWeight: 600 }} onClick={handleExtend} disabled={statusLoad}>
              Request Extension
            </button>
          )}
        </div>
      )}

      <div className="wp-detail-container">
        {/* Main Content */}
        <div className="wp-main-col">

          <div id="sec-schedule" className="container-rounded-white wp-card" >
            <div className="wp-card-head"><i className="fa fa-calendar" />Permit Schedule & Details</div>
            <div className="wp-field-grid">
              <Field label="Permit No." value={permit["Sequence No"]} />
              <Field label="Permit Type" value={typeLabel(permit.type)} />
              <Field label="Scheduled Start" value={scheduledAt} />
              <Field label="Due Date" value={(() => {
                if (!permit['Due Date']) return null;
                const isPassed = dueTimestamp !== null && dueTimestamp <= Date.now();
                return isPassed ? (
                  <span className="text-danger fw-bold">{permit['Due Date']} (Expired)</span>
                ) : (
                  <span className="fw-bold" style={{ color: '#0B4A54' }}>{permit['Due Date']}</span>
                );
              })()} />
              <Field label="Work Duration" value={formatDuration(Number(permit.period_of_work))} />
              <Field label="LOTO Reference" value={permit.loto_reference} />
              <Field label="Priority" value={permit.priority ? (
                <span className="fw-bold" style={{
                  color: String(permit.priority).toLowerCase() === 'high' ? '#DC2626' : (String(permit.priority).toLowerCase() === 'medium' ? '#F59E0B' : '#0B4A54')
                }}>{String(permit.priority).toUpperCase()}</span>
              ) : null} />
              <Field label="Extension Status" value={permit.extension_approval_status?.replace(/_/g, ' ')} />
              <Field label="Requested Due Date" value={permit.requested_due_date} />
            </div>
            {permit.extension_reason && (
              <div className="wp-info-box mt-3">
                <div className="wp-field-label">Extension Reason</div>
                {permit.extension_reason}
              </div>
            )}
          </div>

          <div id="sec-personnel" className="container-rounded-white wp-card" >
            <div className="wp-card-head"><i className="fa fa-users" />Personnel & Vendor Details</div>
            <div className="wp-field-grid">
              <Field label="Raised By" value={permit.raised_by} />
              <Field label="Attended By" value={permit.attended_by_name || permit.attended_by} />
              <Field label="Vendor Name" value={permit.vendor_name} />
              <Field label="Vendor Email" value={permit.vendor_email} />
              <Field label="Primary Contact Person" value={permit.vendor_contact_name} />
              <Field label="Contact Phone" value={permit.vendor_phone} />
              <Field label="Personnel Count" value={permit.no_of_persons} />
              <Field label="Location" value={permit.location_name} />
            </div>
          </div>

          <div id="sec-asset" className="container-rounded-white wp-card" >
            <div className="wp-card-head"><i className="fa fa-cube" />Asset & Equipment Details</div>
            <div className="wp-field-grid">
              <Field label="Asset Name" value={permit.asset_name} />
              <Field label="Sequence No." value={permit.asset_seq} />
              <Field label="Category" value={permit.asset_category} />
              <Field label="NFC Tag Reference" value={permit.nfc_reference || permit.nfc_tag} />
            </div>
            {(permit.asset_description || permit.asset_location_name) && (
              <div className="wp-info-box mt-3">
                <div className="wp-field-label">Asset Description</div>
                {permit.asset_description || permit.asset_location_name}
              </div>
            )}
          </div>

          <div id="sec-safety" className="container-rounded-white wp-card" >
            <div className="wp-card-head"><i className="fa fa-shield" />Safety Measures & Scope</div>
            <div className="wp-field-grid">
              <Field label="Fire Watch Assigned" value={permit.fire_watch} />
              <Field label="Gas Test Reading" value={permit.gas_test_reading} />
              <Field label="PPE Checklist" value={permit.ppe_checklist} />
            </div>

            <div className="wp-info-box mt-3">
              <div className="wp-field-label">Work Scope Description</div>
              {permit.work_to_be_carried || <span className="text-muted fst-italic">No scope added</span>}
            </div>
            {permit.description && (
              <div className="wp-info-box mt-3">
                <div className="wp-field-label">Description</div>
                {permit.description}
              </div>
            )}

            {dynamicFields.length > 0 && (
              <>
                <div className="wp-mini-head"><i className="fa fa-list-alt me-1" />Permit-Specific Details</div>
                {(() => {
                  const shortFields = [];
                  const longFields = [];
                  dynamicFields.forEach(([key, val]) => {
                    const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val ?? '');
                    (display.length > 50 ? longFields : shortFields).push([key, display]);
                  });
                  return (
                    <>
                      {shortFields.length > 0 && (
                        <div className="wp-field-grid">
                          {shortFields.map(([key, display]) => (
                            <Field key={key} label={key.replace(/_/g, ' ')} value={display} />
                          ))}
                        </div>
                      )}
                      {longFields.map(([key, display]) => (
                        <div className="wp-info-box mt-3" key={key}>
                          <div className="wp-field-label">{key.replace(/_/g, ' ')}</div>
                          {display}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="wp-side-col">
          <div id="sec-approval" className="container-rounded-white wp-card" >
            <div className="wp-card-head"><i className="fa fa-check-circle-o" />Approval Hierarchy</div>

            {hasFlow ? (
              <ApprovalFlowPanel
                approvalLevels={permit.approval_levels}
                permitStatus={status}
                extensionApprovalStatus={permit.extension_approval_status}
                onAction={handleAction}
                actionLoad={actionLoad}
                loggedInUser={loggedInUser}
                approvalBlocked={approvalBlocked}
              />
            ) : (
              <>
                <p className="text-muted small mb-3">
                  {status === 'PENDING'
                    ? (isOwner
                      ? 'No multi-level flow configured. Take a direct action below.'
                      : 'No multi-level flow configured. Awaiting action from the Work Permit creator.')
                    : 'No approval flow attached to this permit.'}
                </p>
                {isOwner && (
                  <SimpleActionPanel
                    permitStatus={status}
                    extensionApprovalStatus={permit.extension_approval_status}
                    onAction={handleAction}
                    actionLoad={actionLoad}
                    approvalBlocked={approvalBlocked}
                  />
                )}

                {approvalActions.length > 0 && (
                  <div className="mt-3 d-flex flex-column gap-2">
                    {approvalActions.map((act, i) => (
                      <div key={act.uuid || i}
                        className="border-start border-3 ps-3"
                        style={{ borderColor: act.status === 'APPROVE' ? '#10B981' : act.status === 'DECLINE' ? '#DC2626' : '#F59E0B' }}>
                        <div className="d-flex justify-content-between">
                          <span className="fw-semibold small">{act.actor || 'System'}</span>
                          <span className="text-muted" style={{ fontSize: 11 }}>
                            {act.created_at ? new Date(act.created_at.includes('T') ? act.created_at : act.created_at.replace(' ', 'T') + 'Z').toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <span className={`status-badge ${(act.status || '').toLowerCase()}`} style={{ fontSize: 10 }}>
                          {(act.status || '').replace(/_/g, ' ')}
                        </span>
                        {act.comment && <p className="text-muted small mt-1 mb-0">"{act.comment}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div id="sec-timeline" className="d-flex flex-column gap-3">
            <StatusTimeline status={status} permit={permit} />
          </div>

          <div id="sec-gatepass" className="d-flex flex-column gap-3">
            {canPreviewPdf && (
              <div className="container-rounded-white wp-card" >
                <div className="wp-card-head"><i className="fa fa-download" />Export Options</div>
                <div className="wp-action-grid">
                  <button className="btn btn-outline-secondary btn-sm fw-bold" onClick={handlePreviewPdf} disabled={pdfLoad}>
                     Preview
                  </button>
                  <button className="btn btn-outline-secondary btn-sm fw-bold" onClick={handleDownloadPdf}>
                     Download
                  </button>
                  <button className="btn btn-outline-secondary btn-sm fw-bold" onClick={handleShareEmail} disabled={emailLoad}>
                     Email
                  </button>
                  <button className="btn btn-outline-secondary btn-sm fw-bold" onClick={handleShareWhatsApp}>
                     WhatsApp
                  </button>
                </div>
              </div>
            )}
            
            {permit.gate_pass_uuid && (
              <div className="container-rounded-white wp-card" >
                <div className="wp-card-head"><i className="fa fa-id-card" />Linked Gate Pass</div>
                <div className="text-muted mb-3" style={{ fontSize: 11.5, marginTop: -6 }}>
                  Created once on final approval and retained after extension reapproval
                </div>
                <div className="wp-linked-gp-card">
                  {permit.qr_code_url && (
                    <a href={resolveGatePassUrl(permit.qr_code_url)} target="_blank" rel="noopener noreferrer" className="wp-qr-box wp-linked-gp-qr" title="Open linked Gate Pass QR">
                      <img src={resolveGatePassUrl(permit.qr_code_url)} alt="Linked Gate Pass QR" />
                    </a>
                  )}
                  <div className="wp-linked-gp-copy">
                    <a
                      href={resolveGatePassUrl(`/#!/site/${siteId}/browse/uuid/${permit.gate_pass_uuid}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-100 btn-sm btn-outline-info"
                    >
                      <i className={`fa ${status === 'APPROVED' ? 'fa-plus' : 'fa-external-link'} me-1`} />
                      {status === 'APPROVED' ? 'Add / Update Items' : 'View Gate Pass'}
                    </a>
                    <a
                      href={resolveMaterialPassUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-100 btn-sm btn-outline-success"
                    >
                      <i className="fa fa-check-circle me-1" />
                      Verify Items at Gate
                    </a>
                  </div>
                </div>
              </div>
            )}

            {permit._material_gatepass_enabled && !permit.gate_pass_uuid && ['APPROVED', 'ACTIVE', 'COMPLETED'].includes(status) && (
              <MaterialGatePassPanel wpUuid={id} canRaise={['APPROVED', 'ACTIVE'].includes(status)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
