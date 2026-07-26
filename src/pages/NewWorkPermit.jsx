import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workPermitService from '@/services/workPermitService';
import formService from '@/services/formService';
import SearchableSelect from '@/components/common/SearchableSelect';
import TimeSelect from '@/components/common/TimeSelect';
import LocationTreeSelect from '@/components/common/LocationTreeSelect';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useApp } from '@/context/AppContext';
import { formatDuration } from '@/utils/duration';

const PRIORITIES = ['Urgent', 'High', 'Normal', 'Low'];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Field({ label, required, children, error }) {
  return (
    <div className="mb-2">
      <label className="form-label mb-1" style={{ fontSize: 12, color: '#495057', fontWeight: 500 }}>
        {label}{required && <span className="text-danger ms-1">*</span>}
      </label>
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <i className="fa fa-exclamation-circle" style={{ fontSize: 10, color: '#DC2626' }} />
          <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function DynamicField({ field, value, onChange }) {
  const fieldName = field.col_name;
  const fieldLabel = field.name;
  const fieldType = field.type;
  const fieldData = typeof field.data === 'string' ? JSON.parse(field.data) : (field.data || {});
  const isRequired = fieldData.is_required || false;
  const placeholder = fieldData.placeholder || '';
  const options = typeof field.option === 'string' ? JSON.parse(field.option) : (field.option || []);

  const common = {
    id: fieldName,
    name: fieldName,
    value: value || '',
    onChange: (e) => onChange(fieldName, e.target.value),
    placeholder,
    required: isRequired,
    className: 'form-control form-control-sm',
  };

  if (fieldType === 'textarea') {
    return <Field label={fieldLabel} required={isRequired}><textarea {...common} rows={2} /></Field>;
  }
  if (fieldType === 'select') {
    return (
      <Field label={fieldLabel} required={isRequired}>
        <select {...common} className="form-select form-select-sm">
          <option value="">-- Select --</option>
          {options.map(opt => (
            <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
          ))}
        </select>
      </Field>
    );
  }
  if (fieldType === 'checkbox') {
    return (
      <div className="mb-2">
        <label className="form-label mb-1" style={{ fontSize: 12, color: 'transparent', userSelect: 'none' }}>&nbsp;</label>
        <div className="d-flex align-items-center gap-2">
          <input
            type="checkbox"
            id={fieldName}
            checked={!!value}
            onChange={(e) => onChange(fieldName, e.target.checked)}
            className="form-check-input mt-0"
            style={{ width: 15, height: 15 }}
          />
          <label htmlFor={fieldName} style={{ fontSize: 12, color: '#495057', cursor: 'pointer', marginBottom: 0 }}>
            {fieldLabel}{isRequired && <span className="text-danger ms-1">*</span>}
          </label>
        </div>
      </div>
    );
  }
  const inputType = fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : fieldType === 'email' ? 'email' : 'text';
  return <Field label={fieldLabel} required={isRequired}><input type={inputType} {...common} /></Field>;
}

export default function NewWorkPermit() {
  const { siteId, sequence } = useParams();
  const isEditMode = !!sequence;
  const navigate = useNavigate();
  const { permitTypes } = useApp();
  const [editUuid, setEditUuid] = useState(null);

  const [form, setForm] = useState({
    "Sequence No": '', asset_id: '', loto_no: '', location_uuid: '',
    description: '', work_to_be_carried: '', attended_by: '',
    no_of_persons: '', start_date: '', start_time: '',
    period_of_work: '', priority: '', type: '',
    vendor_uuid: '', vendor_contact_name: '', vendor_email: '', vendor_mobile: '',
    alt_email: '', alt_mobile: '',
    approval_flow_uuid: '',
  });

  const [dynamicValues, setDynamicValues] = useState({});
  const [dynamicFields, setDynamicFields] = useState([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [allAssets, setAllAssets] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [approvalFlows, setApprovalFlows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    workPermitService.getAssets(siteId).then(r => setAllAssets(r.data?.data || [])).catch(() => { });
    workPermitService.getLocations(siteId).then(r => setLocationOptions(r.data?.data || [])).catch(() => { });
    workPermitService.getRoles().then(r => setEmployees(r.data?.data || r.data || [])).catch(() => { });
    workPermitService.getVendors().then(r => setVendors(r.data?.data || [])).catch(() => { });
    workPermitService.getApprovalFlows().then(r => {
      const flows = (r.data?.data || []).map(row => ({ ...row.n, levels: row.l || [] }));
      setApprovalFlows(flows);
      const validFlows = flows.filter(flow => flow.levels.length > 0 && flow.levels.every(level => !!level.role_id));
      if (!isEditMode && validFlows.length === 1) setForm(prev => ({ ...prev, approval_flow_uuid: validFlows[0].uuid }));
    }).catch(() => { });
  }, [siteId]);

  useEffect(() => {
    if (!isEditMode) return;
    workPermitService.getBySequence(sequence).then(res => {
      const permit = res.data?.data;
      if (!permit || !['DRAFT', 'REQUEST_CHANGE'].includes(permit.status)) {
        navigate(`/site/${siteId}/work-permit/${sequence}`);
        return;
      }
      setEditUuid(permit.uuid);
      setForm(prev => ({
        ...prev,
        "Sequence No": permit["Sequence No"] || '',
        asset_id: permit.asset_id || '', loto_no: permit.loto_no || '', location_uuid: permit.location_uuid || '',
        description: permit.description || '', work_to_be_carried: permit.work_to_be_carried || '', attended_by: permit.attended_by || '',
        no_of_persons: permit.no_of_persons || '', start_date: permit['Scheduled Date'] || permit.start_date || '', start_time: permit.start_time || '',
        period_of_work: permit.period_of_work || '', priority: permit.priority || '', type: permit.type || '',
        vendor_uuid: permit.vendor_uuid || '', vendor_contact_name: permit.vendor_contact_name || '', vendor_email: permit.vendor_email || '', vendor_mobile: permit.vendor_mobile || '',
        alt_email: '', alt_mobile: '',
        approval_flow_uuid: permit.approval_flow_uuid || '',
      }));
      setDynamicValues(permit.dynamic_fields && typeof permit.dynamic_fields === 'object' ? permit.dynamic_fields : {});
      if (permit.type) {
        setDynamicLoading(true);
        formService.getForms()
          .then(res2 => {
            const forms = res2.data?.data || [];
            const matchedForm = forms.find(f => (f.tag || f.type) === permit.type);
            setDynamicFields(matchedForm?.fields || []);
          })
          .catch(() => { })
          .finally(() => setDynamicLoading(false));
      }
    }).catch(() => {
      navigate(`/site/${siteId}/work-permit`);
    }).finally(() => setLoadingExisting(false));
  }, [sequence]);

  function findLocationName(nodes, uuid) {
    for (const n of (nodes || [])) {
      if (n.uuid === uuid) return n.Name;
      const found = findLocationName(n._children, uuid);
      if (found) return found;
    }
    return null;
  }

  const selectedLocationName = form.location_uuid ? findLocationName(locationOptions, form.location_uuid) : null;
  const assets = selectedLocationName ? allAssets.filter(a => a.loc === selectedLocationName) : allAssets;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'start_date' && value === getTodayStr() && prev.start_time && prev.start_time < getNowHHMM()) {
        next.start_time = '';
      }
      return next;
    });
  };

  const handlePermitTypeChange = (val) => {
    setForm(prev => ({ ...prev, type: val }));
    setDynamicFields([]);
    setDynamicValues({});
    if (val) {
      setDynamicLoading(true);
      formService.getForms()
        .then(res => {
          const forms = res.data?.data || [];
          const matchedForm = forms.find(f => (f.tag || f.type) === val);
          setDynamicFields(matchedForm?.fields || []);
        })
        .catch(() => { })
        .finally(() => setDynamicLoading(false));
    }
  };

  const handleVendorChange = (uuid) => {
    const vendor = vendors.find(v => v.uuid === uuid);
    setForm(prev => ({
      ...prev,
      vendor_uuid: uuid,
      vendor_email: vendor?.Email || vendor?.email || '',
      vendor_mobile: vendor?.Mobile || vendor?.mobile || vendor?.Phone || vendor?.phone || '',
      alt_email: '',
      alt_mobile: '',
    }));
  };

  const permitTypeOptions = permitTypes;
  const validApprovalFlows = approvalFlows.filter(flow => flow.levels.length > 0 && flow.levels.every(level => !!level.role_id));

  const vendorOptions = vendors.map(v => ({
    value: v.uuid,
    label: v.Name || v.name,
    searchText: v.Name || v.name,
  }));

  const assetOptions = assets.map(a => ({
    value: a.uuid,
    label: `${a.Name}${a.cat ? ` (${a.cat})` : ''}`,
    searchText: a.Name,
  }));

  const employeeOptions = Array.from(
    new Map(employees.map(e => [e.user_id, e])).values()
  ).map(e => ({
    value: e.user_id,
    label: `${e.name}${e.designation_name ? ` — ${e.designation_name}` : ''}`,
    searchText: e.name,
  }));

  const selectedTypeLabel = permitTypeOptions.find(p => p.value === form.type)?.label;
  const selectedVendorLabel = vendorOptions.find(v => v.value === form.vendor_uuid)?.label;

  const dynamicFieldsValid = dynamicFields.every(f => {
    const fieldData = typeof f.data === 'string' ? JSON.parse(f.data) : (f.data || {});
    if (!fieldData.is_required) return true;
    const val = dynamicValues[f.col_name];
    return f.type === 'checkbox' ? !!val : val !== undefined && val !== null && String(val).trim() !== '';
  });

  const REQ = 'This field is required';
  const err = (isInvalid) => (touched && isInvalid ? REQ : null);

  const validateForm = () => {
    setTouched(true);
    const missing = [];
    if (!form.priority) missing.push('Priority');
    if (!form.start_date) missing.push('Scheduled Date');
    if (!form.start_time) missing.push('Start Time');
    if (!form.no_of_persons) missing.push('No. of Persons');
    if (!form.type) missing.push('Permit Type');
    if (!form.vendor_uuid && !form.vendor_contact_name.trim()) missing.push('Vendor or Name of Person');
    if (!(form.alt_mobile || form.vendor_mobile)) missing.push('Mobile No.');
    if (!dynamicFieldsValid) missing.push('Required Safety Fields');
    if (!form.location_uuid) missing.push("Location");
    if (!form.asset_id) missing.push("Asset");

    if (missing.length > 0) {
      setSubmitError(`Please complete all required fields: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (status = 'PENDING') => {
    if (status === 'PENDING') {
      if (!validateForm()) return;
    } else {
      // Draft mode minimal checks
      if (!form.vendor_uuid && !form.vendor_contact_name.trim()) {
        setSubmitError('Select a Vendor or enter the Name of Person.');
        return;
      }
      if (!(form.alt_mobile || form.vendor_mobile)) {
        setSubmitError('Mobile No. is required to save the Work Permit.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        status,
        dynamic_fields: dynamicValues,
        vendor_email: form.alt_email || form.vendor_email,
        vendor_mobile: form.alt_mobile || form.vendor_mobile,
        'Scheduled Date': form.start_date,
      };
      delete payload.start_date;
      if (isEditMode) {
        await workPermitService.update({ ...payload, uuid: editUuid });
        navigate(`/site/${siteId}/work-permit/${sequence}`);
      } else {
        await workPermitService.create(payload);
        navigate(`/site/${siteId}/work-permit`);
      }
    } catch {
      setSubmitError('Failed to submit work permit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="wp-page container-rounded-white">
        <div className="wp-empty-state">
          <i className="fa fa-circle-o-notch fa-spin" />
          <div className="wp-state-title">Loading work permit…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wp-page">
      <ConfirmDialog
        show={!!submitError}
        title="Form Incomplete"
        message={submitError}
        confirmLabel="OK"
        confirmVariant="secondary"
        onConfirm={() => setSubmitError(null)}
      />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold text-primary-dark mb-0">{isEditMode ? 'Edit Work Permit' : 'Raise Work Permit'}</h5>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Fill out the details below to submit a work permit request</div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit('PENDING'); }}>
        {/* Section 1: Basic Info & Schedule */}
        <div className="container-rounded-white p-4 mb-4" style={{ background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#17A2B8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-info-circle" style={{ fontSize: 13 }} /> Basic & Schedule Information
          </div>
          
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <Field label="Priority" required error={err(!form.priority)}>
                <SearchableSelect
                  options={PRIORITIES.map(p => ({ value: p.toUpperCase(), label: p }))}
                  value={form.priority}
                  onChange={val => setForm(prev => ({ ...prev, priority: val }))}
                  placeholder="Select priority"
                />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Location" required>
                <LocationTreeSelect
                  locationTree={locationOptions}
                  value={form.location_uuid}
                  onChange={uuid => setForm(prev => ({ ...prev, location_uuid: uuid, asset_id: '' }))}
                  placeholder="Select location"
                />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Asset" required>
                <SearchableSelect
                  options={assetOptions}
                  value={form.asset_id}
                  onChange={val => setForm(prev => ({ ...prev, asset_id: val }))}
                  placeholder={form.location_uuid ? 'Select asset at location' : 'Select asset'}
                />
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Permit No.">
                <input
                  type="text" className="form-control form-control-sm"
                  value={isEditMode && form['Sequence No'] ? form['Sequence No'] : 'Auto Generated'}
                  disabled style={{ color: '#adb5bd', background: '#f8f9fa' }}
                />
              </Field>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-2">
              <Field label="Scheduled Date" required error={err(!form.start_date)}>
                <input type="date" name="start_date" className="form-control form-control-sm" value={form.start_date} min={getTodayStr()} onChange={handleChange} required />
              </Field>
            </div>
            <div className="col-md-2">
              <Field label="Start Time" required error={err(!form.start_time)}>
                <TimeSelect
                  value={form.start_time}
                  onChange={val => setForm(prev => ({ ...prev, start_time: val }))}
                  minTime={form.start_date === getTodayStr() ? getNowHHMM() : null}
                  required
                />
              </Field>
            </div>
            <div className="col-md-2">
              <Field label="Duration (hrs)">
                <input type="number" name="period_of_work" className="form-control form-control-sm" value={form.period_of_work} onChange={handleChange} placeholder="e.g. 4" min={0} />
                {form.period_of_work !== '' && !isNaN(Number(form.period_of_work)) && (
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>{formatDuration(Number(form.period_of_work))}</div>
                )}
              </Field>
            </div>
            <div className="col-md-2">
              <Field label="No. of Persons" required error={err(!form.no_of_persons)}>
                <input type="number" name="no_of_persons" className="form-control form-control-sm" value={form.no_of_persons} onChange={handleChange} placeholder="0" min={1} required />
              </Field>
            </div>
            <div className="col-md-2">
              <Field label="LOTO No.">
                <input type="text" name="loto_no" className="form-control form-control-sm" value={form.loto_no} onChange={handleChange} placeholder="LOTO number" />
              </Field>
            </div>
            <div className="col-md-2">
              <Field label="Attended By">
                <SearchableSelect
                  options={employeeOptions}
                  value={form.attended_by}
                  onChange={val => setForm(prev => ({ ...prev, attended_by: val }))}
                  placeholder="Select person"
                />
              </Field>
            </div>
            {validApprovalFlows.length > 0 && (
              <div className="col-md-4 mt-2">
                <Field label="Approval Flow">
                  <SearchableSelect
                    options={validApprovalFlows.map(f => ({ value: f.uuid, label: f.Name }))}
                    value={form.approval_flow_uuid}
                    onChange={val => setForm(prev => ({ ...prev, approval_flow_uuid: val }))}
                    placeholder="Select approval flow"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Permit Type & Work Description */}
<div className="container-rounded-white p-4 mb-4" style={{ background: "#fff" }}>
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: "#17A2B8",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <i className="fa fa-file-text" style={{ fontSize: 13 }} />
    Permit Type & Work Description
  </div>

  <div className="row gx-2">

    {/* Left Column */}
    <div className="col-md-5">

      <Field label="Permit Type" required error={err(!form.type)}>
        <SearchableSelect
          options={permitTypeOptions}
          value={form.type}
          onChange={handlePermitTypeChange}
          placeholder="Select permit type"
        />
      </Field>

      <Field label="Work to be Carried Out">
        <textarea
          name="work_to_be_carried"
          className="form-control form-control-sm"
          rows={3}
          value={form.work_to_be_carried}
          onChange={handleChange}
          placeholder="Describe specific work tasks, procedures, or equipment"
        />
      </Field>

    </div>

    {/* Right Column */}
    <div className="col-md-7">

      <Field label="Description">
        <textarea
          name="description"
          className="form-control form-control-sm"
          rows={7}
          value={form.description}
          onChange={handleChange}
          placeholder="Briefly describe the nature of work"
        />
      </Field>

    </div>

  </div>
</div>
        {/* Section 3: Permit Specific Requirements (Dynamic Fields) */}
        <div className="container-rounded-white p-4 mb-4" style={{ background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#17A2B8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-list-alt" style={{ fontSize: 13 }} />
            {selectedTypeLabel ? `${selectedTypeLabel} — Specific Requirements` : 'Permit Specific Requirements'}
          </div>

          {!form.type ? (
            <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
              <i className="fa fa-hand-o-up fa-2x mb-2 d-block" style={{ color: '#94A3B8' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No Permit Type Selected</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Please select a Permit Type above to display required safety checklists and fields.
              </div>
            </div>
          ) : dynamicLoading ? (
            <div className="text-muted py-4" style={{ fontSize: 13, textAlign: 'center' }}>
              <i className="fa fa-circle-o-notch fa-spin me-2" />Loading fields for {selectedTypeLabel}...
            </div>
          ) : dynamicFields.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: '#F0FDF4', borderRadius: 8, border: '1px solid #DCFCE7' }}>
              <i className="fa fa-check-circle fa-2x mb-2 d-block" style={{ color: '#10B981' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>No additional requirements</div>
              <div style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>
                The <strong>{selectedTypeLabel}</strong> permit type has no extra custom fields required.
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {dynamicFields.map(field => (
                <div className="col-md-4" key={field.id}>
                  <DynamicField
                    field={field}
                    value={dynamicValues[field.col_name]}
                    onChange={(name, val) => setDynamicValues(prev => ({ ...prev, [name]: val }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Vendor & Contact Information */}
        <div className="container-rounded-white p-4 mb-4" style={{ background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#17A2B8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-building-o" style={{ fontSize: 13 }} /> Vendor & Contact Information
          </div>
          <div className="row g-3">
            <div className="col-md-3">
              <Field label="Vendor" required={!form.vendor_contact_name.trim()} error={err(!form.vendor_uuid && !form.vendor_contact_name.trim())}>
                {form.vendor_uuid ? (
                  <div className="d-flex align-items-center gap-2 form-control form-control-sm">
                    <i className="fa fa-building-o text-info" style={{ fontSize: 12 }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{selectedVendorLabel}</span>
                    <i className="fa fa-times text-muted" style={{ fontSize: 11, cursor: 'pointer' }} onClick={() => handleVendorChange('')} />
                  </div>
                ) : (
                  <SearchableSelect options={vendorOptions} value={form.vendor_uuid} onChange={handleVendorChange} placeholder="Select vendor" />
                )}
              </Field>
            </div>
            <div className="col-md-3">
              <Field label="Name of Person" required={!form.vendor_uuid} error={err(!form.vendor_uuid && !form.vendor_contact_name.trim())}>
                <input type="text" name="vendor_contact_name" className="form-control form-control-sm" value={form.vendor_contact_name} onChange={handleChange} placeholder="Person representing vendor" maxLength={100} required={!form.vendor_uuid} />
              </Field>
            </div>
            {form.vendor_uuid ? (
              <>
                <div className="col-md-3">
                  <Field label="Alternative Email">
                    <input type="email" name="alt_email" className="form-control form-control-sm" value={form.alt_email} onChange={handleChange} placeholder={form.vendor_email || 'e.g. other@company.com'} />
                    {form.vendor_email && !form.alt_email && (
                      <div className="text-muted mt-1" style={{ fontSize: 11 }}><i className="fa fa-info-circle me-1" />Using: {form.vendor_email}</div>
                    )}
                  </Field>
                </div>
                <div className="col-md-3">
                  <Field label="Mobile No." required error={err(!form.alt_mobile && !form.vendor_mobile)}>
                    <input type="tel" name="alt_mobile" className="form-control form-control-sm" value={form.alt_mobile} onChange={handleChange} placeholder={form.vendor_mobile || 'e.g. 9876543210'} maxLength={15} required={!form.vendor_mobile} />
                    {form.vendor_mobile && !form.alt_mobile && (
                      <div className="text-muted mt-1" style={{ fontSize: 11 }}><i className="fa fa-info-circle me-1" />Using: {form.vendor_mobile}</div>
                    )}
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className="col-md-3">
                  <Field label="Vendor Email">
                    <input type="email" name="vendor_email" className="form-control form-control-sm" value={form.vendor_email} onChange={handleChange} placeholder="vendor@company.com" />
                  </Field>
                </div>
                <div className="col-md-3">
                  <Field label="Mobile No." required error={err(!form.vendor_mobile)}>
                    <input type="tel" name="vendor_mobile" className="form-control form-control-sm" value={form.vendor_mobile} onChange={handleChange} placeholder="e.g. 9876543210" maxLength={15} required />
                  </Field>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 mb-5" style={{ borderTop: '1px solid #E5E7EB' }}>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-4"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
            >
              <i className="fa fa-floppy-o me-1" />Save as Draft
            </button>
            <button
              type="submit"
              className="btn btn-success btn-sm px-4"
              disabled={submitting}
            >
              {submitting
                ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Submitting...</>
                : <><i className="fa fa-paper-plane me-1" />{isEditMode ? 'Save & Send for Approval' : form.approval_flow_uuid ? 'Raise & Send for Approval' : 'Raise Work Permit'}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
