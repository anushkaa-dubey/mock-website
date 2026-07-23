// Single source of sample data for the mock sandbox's fake context + fake services.
// Tweak these values to see how the UI reacts to different data — nothing here talks
// to a real backend.

export const mockUser = {
  id: 101,
  api_token: 'mock-token',
  societyId: 1,
  role_id: 20,
  role_name: 'Safety Officer',
  designation_name: 'Safety Officer',
  name: 'Dev Intern',
  society: { uuid: 'site-uuid-mock-001' },
};

export const mockSite = {
  ppm_site: { uuid: 'site-uuid-mock-001', is_setup_work_permit: 1 },
  roles: [{ id: 20, name: 'admin' }],
};

export const mockPermitTypes = [
  { label: 'Hot Work',        value: 'HOT_WORK' },
  { label: 'Cold Work',       value: 'COLD_WORK' },
  { label: 'Height Work',     value: 'HEIGHT_WORK' },
  { label: 'Confined Space',  value: 'CONFINED_SPACE' },
];

export const mockStatuses = [
  'DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED',
  'EXPIRED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'REQUEST_CHANGE',
];

export const mockApprovalFlowConfig = { uuid: 'flow-uuid-001' };

// Per-type dynamic form fields (formService.getForms/getFormByType) — drives
// the "Permit-Specific Details" section in NewWorkPermit step 3 and the
// dynamic_fields shown on WorkPermitDetail. Shape matches what DynamicField
// in NewWorkPermit.jsx expects: col_name/name/type/data{is_required,placeholder}/option.
export const mockForms = [
  {
    tag: 'HOT_WORK', type: 'HOT_WORK', name: 'Hot Work', is_enable: 1,
    fields: [
      { id: 1, col_name: 'fire_watch_assigned', name: 'Fire Watch Assigned',    type: 'checkbox', data: { is_required: false } },
      { id: 2, col_name: 'gas_test_reading',     name: 'Gas Test Reading (% LEL)', type: 'text',   data: { is_required: true, placeholder: 'e.g. 0%' } },
      { id: 3, col_name: 'ppe_checklist',        name: 'PPE Checklist',          type: 'textarea', data: { is_required: false, placeholder: 'List required PPE items' } },
    ],
  },
  {
    tag: 'COLD_WORK', type: 'COLD_WORK', name: 'Cold Work', is_enable: 1,
    fields: [
      { id: 4, col_name: 'isolation_verified', name: 'Isolation Verified', type: 'checkbox', data: { is_required: true } },
      { id: 5, col_name: 'tools_used',          name: 'Tools to be Used',  type: 'text',      data: { is_required: false, placeholder: 'e.g. hand tools only' } },
    ],
  },
  {
    tag: 'HEIGHT_WORK', type: 'HEIGHT_WORK', name: 'Height Work', is_enable: 1,
    fields: [
      { id: 6, col_name: 'harness_inspected', name: 'Harness Inspected',   type: 'checkbox', data: { is_required: true } },
      { id: 7, col_name: 'working_height',    name: 'Working Height (m)', type: 'number',    data: { is_required: true, placeholder: 'e.g. 12' } },
      {
        id: 8, col_name: 'weather_condition', name: 'Weather Condition', type: 'select', data: { is_required: false },
        option: [{ label: 'Clear', value: 'CLEAR' }, { label: 'Windy', value: 'WINDY' }, { label: 'Rainy', value: 'RAINY' }],
      },
    ],
  },
  {
    tag: 'CONFINED_SPACE', type: 'CONFINED_SPACE', name: 'Confined Space', is_enable: 1,
    fields: [
      { id: 9,  col_name: 'oxygen_level',         name: 'Oxygen Level (%)',      type: 'text',     data: { is_required: true, placeholder: 'e.g. 20.9%' } },
      { id: 10, col_name: 'ventilation_provided', name: 'Ventilation Provided',  type: 'checkbox', data: { is_required: false } },
    ],
  },
];

/* ─── Dropdown data for raising a new Work Permit (NewWorkPermit.jsx) ────── */
// Front-end-only replacements for what getLocations/getAssets/getVendors/
// getRoles/getApprovalFlows would normally fetch — lets the "Raise Work
// Permit" flow be completed end-to-end with no backend at all.

export const mockLocationTree = [
  {
    uuid: 'loc-tower-a', Name: 'Tower A', _children: [
      { uuid: 'loc-tower-a-terrace',  Name: 'Tower A - Terrace',           _children: [] },
      { uuid: 'loc-tower-a-basement', Name: 'Tower A - Basement Parking',  _children: [] },
    ],
  },
  {
    uuid: 'loc-tower-b', Name: 'Tower B', _children: [
      { uuid: 'loc-tower-b-terrace', Name: 'Tower B - Terrace', _children: [] },
    ],
  },
];

export const mockAssets = [
  { uuid: 'asset-001', Name: 'Rooftop Chiller Unit', cat: 'HVAC',        loc: 'Tower B - Terrace' },
  { uuid: 'asset-002', Name: 'Backup Generator',     cat: 'Electrical',  loc: 'Tower A - Basement Parking' },
  { uuid: 'asset-003', Name: 'Fire Pump',             cat: 'Fire Safety', loc: 'Tower A - Terrace' },
  { uuid: 'asset-004', Name: 'AHU Unit 3',            cat: 'HVAC',        loc: 'Tower A - Terrace' },
];

export const mockVendors = [
  { uuid: 'vendor-001', Name: 'Apex Contractors',    Email: 'contact@apexcontractors.example', Mobile: '9876543210' },
  { uuid: 'vendor-002', Name: 'BlueStar Facilities',  Email: 'ops@bluestarfm.example',           Mobile: '9123456780' },
];

export const mockEmployees = [
  { user_id: 201,         name: 'Anita Rao',        designation_name: 'Site Engineer' },
  { user_id: 202,         name: 'Site Supervisor',  designation_name: 'Supervisor' },
  { user_id: mockUser.id, name: mockUser.name,       designation_name: mockUser.designation_name },
];

// Matches GET v3/approvals/levels — mapped by getApprovalFlows() into
// { ...row.n, levels: row.l } — needs every level to have a role_id to count
// as a "valid" flow the form will offer.
export const mockApprovalFlowsRaw = [
  {
    n: { uuid: 'flow-uuid-001', Name: 'Standard 2-Level Approval' },
    l: [
      { role_id: 10, level: 1, Name: 'Site Engineer' },
      { role_id: mockUser.role_id, level: 2, Name: 'Safety Officer' },
    ],
  },
];

export function createMockWorkPermit() {
  return {
    uuid: 'wp-uuid-001',
    'Sequence No': 'WP-0001',
    type: 'HOT_WORK',
    status: 'PENDING',
    priority: 'High',
    raised_by: 'Priya Sharma',
    created_by: mockUser.id,
    'Scheduled Date': '2026-07-25',
    start_time: '09:00',
    'Due Date': '2026-07-28 18:00',
    due_at_utc: Math.floor(new Date('2026-07-28T18:00:00').getTime() / 1000),
    loto_no: 'LOTO-2231',
    period_of_work: 8,
    no_of_persons: 4,
    vendor_name: 'Apex Contractors',
    vendor_contact_name: 'Ramesh Yadav',
    vendor_email: 'ramesh@apexcontractors.example',
    vendor_mobile: '9876543210',
    location_name: 'Tower B - Terrace',
    asset_name: 'Rooftop Chiller Unit',
    asset_seq: 'AST-0098',
    asset_category: 'HVAC',
    asset_location_name: 'Terrace Plant Room',
    asset_nfc_tag: 'NFC-88213',
    asset_description: 'Primary chiller unit serving Tower B',
    description: 'Hot work permit for chiller repair welding job.',
    work_to_be_carried: 'Welding and brazing on chiller refrigerant lines.',
    attended_by_name: 'Site Supervisor',
    dynamic_fields: {
      fire_watch_assigned: true,
      ppe_checklist: 'Helmet, Gloves, Goggles, Fire Blanket',
      gas_test_reading: '0% LEL',
    },
    approval_levels: [
      {
        level: { level: 1, Name: 'Site Engineer', role_id: 10, uuid: 'lvl-1' },
        action: { status: 'APPROVE', comment: 'Looks good, proceed.', actor: 'Anita Rao', updated_at: '2026-07-23 09:15:00' },
        actor_name: 'Anita Rao',
      },
      {
        level: { level: 2, Name: 'Safety Officer', role_id: mockUser.role_id, uuid: 'lvl-2' },
        action: null,
      },
    ],
    actions: [],
    _uh: [
      { s: 'DRAFT',   t: '2026-07-22 10:00:00', actor: 'Priya Sharma' },
      { s: 'PENDING', t: '2026-07-22 10:05:00', actor: 'Priya Sharma' },
    ],
    extension_approval_status: null,
    requested_due_date: null,
    extension_reason: null,
    pdf_url: null,
    gate_pass_uuid: null,
    qr_code_url: null,
    _material_gatepass_enabled: true,
  };
}

export const mockMaterialGatePasses = [
  {
    uuid: 'gp-uuid-001',
    EntryorExit: 'Out',
    passType: 'non_returnable',
    status: 'RELEASED',
    'Sequence No': 'GP-0004',
    vendor_name: 'Apex Contractors',
    item_count: 2,
    'Date Created': 'Jul 20, 2026',
    qr_code_url: null,
    gp_url: null,
  },
];

export const mockItemSearchResults = [
  { uuid: 'item-001', Name: 'Welding Rod (2.5mm)' },
  { uuid: 'item-002', Name: 'Safety Harness' },
  { uuid: 'item-003', Name: 'Fire Extinguisher (CO2, 4.5kg)' },
];

export const mockItemStock = [{ warehouse: 'Main Store', stock: 42 }];

/* ─── Dashboard widget data (drives src/dashboard-widgets/wp-*.html) ────── */

// Matches the shape of GET v3/wp/status — used by wp-status-summary /
// wp-by-type / wp-upcoming to know status labels/order/WIP grouping.
export const mockWpStatusDefs = [
  { Name: 'DRAFT',          order: 1,  Type: 'IDLE' },
  { Name: 'PENDING',        order: 2,  Type: 'WIP'  },
  { Name: 'REQUEST_CHANGE', order: 3,  Type: 'IDLE' },
  { Name: 'APPROVED',       order: 4,  Type: 'WIP'  },
  { Name: 'ACTIVE',         order: 5,  Type: 'WIP'  },
  { Name: 'COMPLETED',      order: 6,  Type: 'DONE' },
  { Name: 'DECLINED',       order: 7,  Type: 'DONE' },
  { Name: 'SUSPENDED',      order: 8,  Type: 'IDLE' },
  { Name: 'EXPIRED',        order: 9,  Type: 'IDLE' },
  { Name: 'CANCELLED',      order: 10, Type: 'DONE' },
];

// Matches GET v1/site/:id/workpermit/stats
export const mockWpStats = {
  total: 42, draft: 4, pending: 6, request_change: 2, approved: 5,
  active: 9, completed: 12, declined: 1, suspended: 2, expired: 1, cancelled: 0,
};

// Matches GET v1/site/:id/workpermit/stats/type
export const mockWpStatsByType = [
  { type: 'HOT_WORK',       draft: 1, pending: 2, approved: 1, active: 3, completed: 4, declined: 0, suspended: 1, expired: 0, cancelled: 0 },
  { type: 'COLD_WORK',      draft: 1, pending: 1, approved: 1, active: 2, completed: 3, declined: 0, suspended: 0, expired: 0, cancelled: 0 },
  { type: 'HEIGHT_WORK',    draft: 1, pending: 2, approved: 2, active: 2, completed: 3, declined: 1, suspended: 1, expired: 1, cancelled: 0 },
  { type: 'CONFINED_SPACE', draft: 1, pending: 1, approved: 1, active: 2, completed: 2, declined: 0, suspended: 0, expired: 0, cancelled: 0 },
];

// Matches GET v1/site/:id/workpermit/stats/priority
export const mockWpStatsByPriority = [
  { priority: 'HIGH',   count: 12 },
  { priority: 'MEDIUM', count: 18 },
  { priority: 'LOW',    count: 9 },
  { priority: 'URGENT', count: 3 },
];

// Matches GET v1/site/:id/workpermit/stats/trend?months=N
export const mockWpStatsTrend = [
  { month: '2026-02', raised: 5, completed: 3 },
  { month: '2026-03', raised: 7, completed: 6 },
  { month: '2026-04', raised: 6, completed: 5 },
  { month: '2026-05', raised: 9, completed: 8 },
  { month: '2026-06', raised: 8, completed: 7 },
  { month: '2026-07', raised: 7, completed: 4 },
];

// Matches GET v1/site/:id/workpermit?date_from=...&date_to=...&status=...
export function createMockUpcomingPermits() {
  const today = new Date();
  const inDays = (n) => {
    const d = new Date(today.getTime() + n * 86400000);
    return d.toISOString().slice(0, 10);
  };
  return [
    { uuid: 'wp-uuid-101', 'Sequence No': 'WP-0011', status: 'ACTIVE',  type: 'HOT_WORK',    'Scheduled Date': inDays(0) },
    { uuid: 'wp-uuid-102', 'Sequence No': 'WP-0012', status: 'APPROVED', type: 'COLD_WORK',   'Scheduled Date': inDays(1) },
    { uuid: 'wp-uuid-103', 'Sequence No': 'WP-0013', status: 'PENDING',  type: 'HEIGHT_WORK', 'Scheduled Date': inDays(2) },
  ];
}
