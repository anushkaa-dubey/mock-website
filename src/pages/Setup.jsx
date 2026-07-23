import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import formService from '@/services/formService';
import workPermitService from '@/services/workPermitService';
import SearchableSelect from '@/components/common/SearchableSelect';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SidebarList from '@/components/common/SidebarList';
import CkEditor4 from '@/components/common/CkEditor4';


const FIELD_TYPES = [
  { value: 'text',     label: 'Text',     icon: 'fa-font' },
  { value: 'number',   label: 'Number',   icon: 'fa-hashtag' },
  { value: 'textarea', label: 'Textarea', icon: 'fa-align-left' },
  { value: 'select',   label: 'Select',   icon: 'fa-list' },
  { value: 'checkbox', label: 'Checkbox', icon: 'fa-check-square-o' },
  { value: 'date',     label: 'Date',     icon: 'fa-calendar' },
  { value: 'email',    label: 'Email',    icon: 'fa-envelope-o' },
];
const EMPTY_FIELD = { name: '', col_name: '', type: 'text', is_required: false, placeholder: '', options: '' };
const DISALLOWED_APPROVAL_ROLES = new Set(['resident', 'member']);
const normalizeRole = value => String(value || '').trim().toLowerCase();

function FieldTypePicker({ value, onChange }) {
  return (
    <div className="d-flex flex-wrap gap-1">
      {FIELD_TYPES.map(t => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
              border: active ? '1.5px solid #17a2b8' : '1.5px solid #dee2e6',
              background: active ? '#e8f6f8' : '#fff',
              color: active ? '#17a2b8' : '#555',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <i className={`fa ${t.icon}`} style={{ fontSize: 11 }} />
            {t.label}
          </button>
        );
      })}
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
    <div className="mb-3">
      {sorted.map((lvl, i) => (
        <div key={lvl.uuid || i}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            onMouseEnter={() => setHoveredRow(lvl.uuid)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: i === 0 ? '#17a2b8' : '#e9ecef',
              color: i === 0 ? '#fff' : '#495057',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {lvl.level}
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 8,
              background: i === 0 ? '#f0fbfd' : '#fafafa',
              border: `1px solid ${i === 0 ? '#b2e4ed' : '#e9ecef'}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#212529' }}>
                  {lvl.Name || `Level ${lvl.level}`}
                  {i === 0 && (
                    <span style={{ marginLeft: 8, fontSize: 10, background: '#17a2b8', color: '#fff', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                      First Approver
                    </span>
                  )}
                  {!lvl.role_id && (
                    <span style={{ marginLeft: 8, fontSize: 10, background: '#dc3545', color: '#fff', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                      Invalid — role required
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                  {lvl.role_id && (
                    <span><i className="fa fa-users me-1" />Role: {groupName(lvl.role_id) || `#${lvl.role_id}`}</span>
                  )}
                  {lvl.user_id && (
                    <span>{lvl.role_id && ' · '}<i className="fa fa-user me-1" />Preferred: {lvl.approver_name || `User #${lvl.user_id}`}</span>
                  )}
                  {!lvl.user_id && !lvl.role_id && '—'}
                </div>
              </div>
              <div className="d-flex gap-2" style={{ opacity: hoveredRow === lvl.uuid || !lvl.role_id ? 1 : 0, transition: 'opacity 0.15s' }}>
                <button className="btn btn-sm btn-link text-info p-0" onClick={() => onEditLevel(flowUuid, lvl)} title="Edit level">
                  <i className="fa fa-pencil" />
                </button>
                <button className="btn btn-sm btn-link text-danger p-0" onClick={() => onDeleteLevel(flowUuid, lvl.uuid)} title="Delete level">
                  <i className="fa fa-times" />
                </button>
              </div>
            </div>
          </div>
          {i < sorted.length - 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, margin: '2px 0' }}>
              <div style={{ width: 2, height: 16, background: '#dee2e6' }} />
              <i className="fa fa-chevron-down" style={{ color: '#adb5bd', fontSize: 9 }} />
            </div>
          )}
        </div>
      ))}
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>
        <div style={{ flexShrink: 0, width: '33%', display: 'flex', flexDirection: 'column' }}>
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

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {(!selectedFlowData.levels || selectedFlowData.levels.length === 0) ? (
                    <p className="text-muted small mb-3">No approval levels yet. Add at least one level.</p>
                  ) : (
                    <LevelTable
                      levels={selectedFlowData.levels}
                      flowUuid={selectedFlowData.uuid}
                      onDeleteLevel={handleDeleteLevel}
                      onEditLevel={handleEditLevel}
                      groupName={groupName}
                    />
                  )}

                  {addingLevel === selectedFlowData.uuid ? (
                    <form onSubmit={(e) => handleAddLevel(selectedFlowData.uuid, e)} className="bg-light rounded p-3 mt-3">
                      <div className="row g-2 align-items-end">
                        <div className="col-md-4">
                          <label className="form-label fw-semibold small mb-1">Level Name</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newLevel.name}
                            onChange={e => setNewLevel(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={`Level ${(selectedFlowData.levels?.length || 0) + 1}`}
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
                            <button type="submit" className="btn btn-primary-dark btn-sm" disabled={savingLevel || !newLevel.role_id}>
                              {savingLevel ? <i className="fa fa-circle-o-notch fa-spin" /> : (editingLevel ? 'Save' : 'Add')}
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-sm"
                              onClick={() => { setAddingLevel(null); setEditingLevel(null); setNewLevel({ name: '', user_id: '', role_id: '' }); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <button className="btn btn-outline-secondary btn-sm mt-3" onClick={() => { setEditingLevel(null); setNewLevel({ name: '', user_id: '', role_id: '' }); setAddingLevel(selectedFlowData.uuid); }}>
                      <i className="fa fa-plus me-1" />Add Level
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

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

  const handlePreview = async (t) => {
    try {
      const res = await workPermitService.renderTemplate(t.id);
      const html = ensureSuccess(res, 'Failed to render preview.') || '';
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
    } catch (error) {
      showDialog('Error', error.message || 'Failed to render preview.', () => setDialog(null), { confirmLabel: 'OK', confirmVariant: 'secondary' });
    }
  };

  if (loading) {
    return <div className="text-center py-5 text-muted"><i className="fa fa-circle-o-notch fa-spin me-2" />Loading...</div>;
  }

  return (
    <div className="container-rounded-white" style={{ padding: 16 }}>
      <ConfirmDialog
        show={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        confirmVariant={dialog?.confirmVariant}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />
      <div className="d-flex align-items-center justify-content-between border-bottom-primary pb-2 mb-3">
        <h6 className="fw-bold text-primary-dark mb-0">
          <i className="fa fa-file-pdf-o me-2" />WP PDF Templates
        </h6>
        {editing ? (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary-dark btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Saving...</> : 'Save'}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-primary-dark btn-sm" onClick={startNew}>
            <i className="fa fa-plus me-1" />Add Template
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-light rounded p-3 mb-3">
          <div className="mb-2">
            <label className="form-label fw-semibold small">Template Name</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="mb-2">
            <label className="form-label fw-semibold small">
              Template Body (HTML, Blade-style — use <code>{'{{ $wp[\'Sequence No\'] }}'}</code>, <code>{'{{ $asset[\'Name\'] }}'}</code>, <code>{'{{ $company }}'}</code>, etc.)
            </label>
            <div className="alert alert-warning py-2 px-3 small mb-2">
              Use <strong>Source</strong> mode when editing Blade directives, variables, or CSS. Visual mode is intended for layout and text changes.
            </div>
            <CkEditor4
              ref={templateEditorRef}
              value={form.body}
              onChange={body => setForm(prev => ({ ...prev, body }))}
              disabled={saving}
            />
          </div>
        </div>
      ) : templates.length === 0 ? (
        <p className="text-muted mb-0">No PDF templates yet. Add one to enable Work Permit PDF generation.</p>
      ) : (
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th className="text-muted fw-semibold">Name</th>
              <th className="text-muted fw-semibold text-center">Active</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id}>
                <td className="fw-semibold small">{t.name}</td>
                <td className="text-center">
                  {t.active ? (
                    <span className="badge bg-success">Active</span>
                  ) : (
                    <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11 }} onClick={() => handleActivate(t)} disabled={activating === t.id}>
                      {activating === t.id ? <i className="fa fa-circle-o-notch fa-spin" /> : 'Set Active'}
                    </button>
                  )}
                </td>
                <td>
                  <div className="d-flex gap-1 justify-content-end">
                    <button className="btn btn-sm btn-link p-1" onClick={() => handlePreview(t)} title="Preview"><i className="fa fa-eye" /></button>
                    <button className="btn btn-sm btn-link p-1" onClick={() => startEdit(t)} title="Edit"><i className="fa fa-pencil" /></button>
                    <button className="btn btn-sm btn-link text-danger p-1" onClick={() => handleDelete(t)} disabled={deleting === t.id} title="Delete">
                      {deleting === t.id ? <i className="fa fa-circle-o-notch fa-spin" /> : <i className="fa fa-trash" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
    const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
    setEditingField(f.id);
    setEditValues({ name: f.name, type: f.type || 'text', placeholder: fieldData.placeholder || '', is_required: !!fieldData.is_required });
  };

  const handleSaveEdit = async (f) => {
    setSavingEdit(true);
    try {
      const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
      await formService.updateField({
        id:       f.id,
        name:     editValues.name,
        col_name: f.col_name,
        type:     editValues.type,
        data:     JSON.stringify({ ...fieldData, placeholder: editValues.placeholder, is_required: editValues.is_required }),
      });
      setFields(prev => prev.map(field => field.id === f.id
        ? { ...field, name: editValues.name, type: editValues.type, data: JSON.stringify({ ...fieldData, placeholder: editValues.placeholder, is_required: editValues.is_required }) }
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
        data: JSON.stringify({ tag: 'work_permit', is_required: newField.is_required, placeholder: newField.placeholder }),
        option: newField.type === 'select' && newField.options
          ? JSON.stringify(newField.options.split(',').map(o => o.trim()).filter(Boolean))
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ConfirmDialog
        show={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        confirmVariant={dialog?.confirmVariant}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />
      <div className="mb-4">
        <h5 className="fw-bold text-primary-dark mb-0">Setup</h5>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid #E5E7EB', paddingBottom: 0 }}>
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

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {tab === 'sequence' && (
        <div className="container-rounded-white">
          <SequenceTab />
        </div>
      )}

      {tab === 'approval' && <ApprovalFlowTab />}

      {tab === 'pdf' && <PdfTemplateTab />}

      {tab === 'types' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>
          <div style={{ flexShrink: 0, width: '33%', display: 'flex', flexDirection: 'column' }}>
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

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="container-rounded-white d-flex flex-column" style={{ flex: 1, overflow: 'hidden' }}>
              {!selectedType ? (
                <div className="text-center text-muted d-flex flex-column align-items-center justify-content-center" style={{ flex: 1 }}>
                  <i className="fa fa-hand-o-left fa-2x mb-3 d-block" />
                  Select a permit type to manage its fields
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-center justify-content-between border-bottom-primary pb-2 mb-3 flex-shrink-0">
                    <h6 className="fw-bold text-primary-dark mb-0">
                      <i className="fa fa-list-alt me-2" />{getTypeLabel(selectedType)} — Fields
                    </h6>
                    <button className="btn btn-primary-dark btn-sm" onClick={() => setShowAddField(v => !v)}>
                      <i className={`fa fa-${showAddField ? 'minus' : 'plus'} me-1`} />
                      {showAddField ? 'Cancel' : 'Add Field'}
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {showAddField && (
                    <form onSubmit={handleAddField} className="bg-light rounded p-3 mb-3">
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Field Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newField.name}
                            onChange={e => setNewField(prev => ({ ...prev, name: e.target.value, col_name: toColName(e.target.value) }))}
                            placeholder="e.g. Working Height"
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small">Type <span className="text-danger">*</span></label>
                          <FieldTypePicker value={newField.type} onChange={v => setNewField(prev => ({ ...prev, type: v }))} />
                        </div>
                        {newField.type !== 'checkbox' && (
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Placeholder</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={newField.placeholder}
                              onChange={e => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                              placeholder="Optional placeholder text"
                            />
                          </div>
                        )}
                        {newField.type === 'select' && (
                          <div className="col-md-6">
                            <label className="form-label fw-semibold small">Options <span className="text-muted">(comma-separated)</span></label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={newField.options}
                              onChange={e => setNewField(prev => ({ ...prev, options: e.target.value }))}
                              placeholder="Option A, Option B"
                            />
                          </div>
                        )}
                        <div className="col-12 d-flex align-items-center gap-3 mt-1">
                          <div className="form-check mb-0">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="field-required"
                              checked={newField.is_required}
                              onChange={e => setNewField(prev => ({ ...prev, is_required: e.target.checked }))}
                            />
                            <label className="form-check-label small fw-semibold" htmlFor="field-required">Required</label>
                          </div>
                          <button type="submit" className="btn btn-primary-dark btn-sm ms-auto" disabled={saving}>
                            {saving ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Saving...</> : 'Save Field'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {fields.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                      <i className="fa fa-list-alt" style={{ fontSize: 28, marginBottom: 10, display: 'block', color: '#D1D5DB' }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>No fields configured</div>
                      <div style={{ fontSize: 12 }}>Add fields to collect specific information for this permit type.</div>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', width: 36 }}>#</th>
                            <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF' }}>Field Name</th>
                            <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF' }}>Type</th>
                            <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', textAlign: 'center' }}>Required</th>
                            <th style={{ width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((f, i) => {
                            const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
                            const isGlobal  = f.society_id === 0;
                            const isEditing = editingField === f.id;
                            const isHovered = hoveredField === f.id;

                            if (isEditing) {
                              return (
                                <tr key={f.id} style={{ background: '#F0FBFD', borderBottom: '1px solid #E5E7EB' }}>
                                  <td style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: 13 }}>{i + 1}</td>
                                  <td style={{ padding: '8px 14px' }}>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ fontSize: 14 }}
                                      value={editValues.name}
                                      onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))}
                                      autoFocus
                                    />
                                  </td>
                                  <td style={{ padding: '8px 14px' }}>
                                    <FieldTypePicker value={editValues.type} onChange={v => setEditValues(p => ({ ...p, type: v }))} />
                                  </td>
                                  <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      style={{ width: 18, height: 18 }}
                                      checked={editValues.is_required}
                                      onChange={e => setEditValues(p => ({ ...p, is_required: e.target.checked }))}
                                    />
                                  </td>
                                  <td style={{ padding: '8px 14px' }}>
                                    <div className="d-flex gap-1">
                                      <button className="btn btn-sm btn-primary-dark" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleSaveEdit(f)} disabled={savingEdit}>
                                        {savingEdit ? <i className="fa fa-circle-o-notch fa-spin" /> : <i className="fa fa-check" />}
                                      </button>
                                      <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setEditingField(null)}>
                                        <i className="fa fa-times" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr
                                key={f.id}
                                style={{ borderBottom: i < fields.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                                onMouseEnter={e => { setHoveredField(f.id); e.currentTarget.style.background = '#F9FAFB'; }}
                                onMouseLeave={e => { setHoveredField(null); e.currentTarget.style.background = 'transparent'; }}
                              >
                                <td style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: 13 }}>{i + 1}</td>
                                <td
                                  style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14, color: '#374151', cursor: isGlobal ? undefined : 'pointer' }}
                                  onClick={isGlobal ? undefined : () => startEditField(f)}
                                  title={isGlobal ? undefined : 'Click to edit'}
                                >
                                  {f.name}
                                  {isGlobal && <i className="fa fa-lock ms-2" style={{ fontSize: 10, color: '#D1D5DB' }} title="System field" />}
                                </td>
                                <td
                                  style={{ padding: '12px 14px', cursor: isGlobal ? undefined : 'pointer' }}
                                  onClick={isGlobal ? undefined : () => startEditField(f)}
                                  title={isGlobal ? undefined : 'Click to edit'}
                                >
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                    background: '#E8F6F8', color: '#17A2B8', border: '1px solid #B2E4ED',
                                  }}>
                                    {f.type}
                                  </span>
                                </td>
                                <td
                                  style={{ padding: '12px 14px', textAlign: 'center', cursor: isGlobal ? undefined : 'pointer' }}
                                  onClick={isGlobal ? undefined : () => handleToggleRequired(f)}
                                  title={isGlobal ? undefined : 'Click to toggle required'}
                                >
                                  {fieldData.is_required
                                    ? <i className="fa fa-check-circle" style={{ color: '#10B981', fontSize: 16 }} />
                                    : <i className="fa fa-circle-o" style={{ color: '#D1D5DB', fontSize: 16 }} />}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  {!isGlobal && (
                                    <button
                                      className="btn btn-sm btn-link text-danger p-0"
                                      style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', fontSize: 14 }}
                                      onClick={() => handleDeleteField(f.id)}
                                      title="Delete field"
                                    >
                                      <i className="fa fa-trash" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
