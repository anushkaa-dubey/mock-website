// FAKE scaffolding for the UI mock sandbox — not part of the real repo.
// Same function names as the real src/services/workPermitService.js so pages/
// components import and call it exactly the same way, but every function
// resolves fixture data instead of hitting the PPM/ISM APIs. Do NOT copy this
// file back — the real repo has the real version.

import { mockUser } from '@/fixtures';
import {
  mockStatuses,
  mockApprovalFlowConfig,
  createMockWorkPermit,
  mockMaterialGatePasses,
  mockItemSearchResults,
  mockItemStock,
  mockLocationTree,
  mockAssets,
  mockVendors,
  mockEmployees,
  mockApprovalFlowsRaw,
} from '@/fixtures';

let allPermits = [
  createMockWorkPermit(),
  {
    uuid: 'wp-uuid-002',
    'Sequence No': 'WP-0002',
    type: 'COLD_WORK',
    status: 'ACTIVE',
    priority: 'Normal',
    raised_by: 'Dev Intern',
    created_by: mockUser.id,
    'Scheduled Date': '2026-07-24',
    start_time: '10:00',
    'Due Date': '2026-07-27 17:00',
    vendor_name: 'BlueStar Facilities',
    vendor_contact_name: 'Suresh Kumar',
    vendor_email: 'ops@bluestarfm.example',
    vendor_mobile: '9123456780',
    location_name: 'Tower A - Basement Parking',
    asset_name: 'Backup Generator',
    description: 'Quarterly maintenance of backup generator.',
    work_to_be_carried: 'Oil filter replacement and electrical check.',
    attended_by_name: 'Anita Rao',
    actions: [],
    _uh: [{ s: 'ACTIVE', t: nowStr(), actor: 'Dev Intern' }],
  },
  {
    uuid: 'wp-uuid-003',
    'Sequence No': 'WP-0003',
    type: 'HEIGHT_WORK',
    status: 'APPROVED',
    priority: 'Urgent',
    raised_by: 'Dev Intern',
    created_by: mockUser.id,
    'Scheduled Date': '2026-07-25',
    start_time: '11:00',
    'Due Date': '2026-07-26 18:00',
    vendor_name: 'Apex Contractors',
    vendor_contact_name: 'Ramesh Yadav',
    vendor_email: 'ramesh@apexcontractors.example',
    vendor_mobile: '9876543210',
    location_name: 'Tower A - Terrace',
    asset_name: 'Fire Pump',
    description: 'Facade glass cleaning and scaffolding inspection.',
    work_to_be_carried: 'Rope access glass cleaning.',
    attended_by_name: 'Site Supervisor',
    actions: [],
    _uh: [{ s: 'APPROVED', t: nowStr(), actor: 'Dev Intern' }],
  },
];

let currentPermit = allPermits[0];
let gatePasses    = mockMaterialGatePasses.slice();

function resolve(data, status = 'success', delay = 250) {
  return new Promise((res) => setTimeout(() => res({ data: { status, data } }), delay));
}

function nowStr() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function findLocationName(nodes, uuid) {
  for (const n of nodes || []) {
    if (n.uuid === uuid) return n.Name;
    const found = findLocationName(n._children, uuid);
    if (found) return found;
  }
  return null;
}

let sequenceCounter = 4;

// Resolves the dropdown uuids/ids in a "Raise Work Permit" form payload (location,
// asset, vendor, attended-by, approval flow) into the display fields WorkPermitDetail
// actually reads — front-end only, no backend involved.
function resolveFormDisplayFields(data) {
  const asset  = mockAssets.find(a => a.uuid === data.asset_id);
  const vendor = mockVendors.find(v => v.uuid === data.vendor_uuid);
  const employee = mockEmployees.find(e => String(e.user_id) === String(data.attended_by));
  const flow = mockApprovalFlowsRaw.find(f => f.n.uuid === data.approval_flow_uuid);

  return {
    type: data.type,
    status: data.status || 'DRAFT',
    priority: data.priority,
    'Scheduled Date': data['Scheduled Date'],
    start_time: data.start_time,
    period_of_work: data.period_of_work ? Number(data.period_of_work) : null,
    no_of_persons: data.no_of_persons ? Number(data.no_of_persons) : null,
    loto_no: data.loto_no,
    location_uuid: data.location_uuid,
    location_name: findLocationName(mockLocationTree, data.location_uuid),
    asset_name: asset?.Name || null,
    asset_category: asset?.cat || null,
    vendor_uuid: data.vendor_uuid,
    vendor_name: vendor?.Name || null,
    vendor_contact_name: data.vendor_contact_name,
    vendor_email: data.vendor_email,
    vendor_mobile: data.vendor_mobile,
    description: data.description,
    work_to_be_carried: data.work_to_be_carried,
    attended_by_name: employee?.name || null,
    dynamic_fields: data.dynamic_fields || {},
    approval_flow_uuid: data.approval_flow_uuid || null,
    approval_levels: flow
      ? flow.l.map(l => ({ level: { level: l.level, Name: l.Name, role_id: l.role_id, uuid: `lvl-${l.level}` }, action: null }))
      : [],
  };
}

// Builds a brand new permit record (fresh uuid/sequence) for create().
function buildNewPermit(data) {
  return {
    uuid: `wp-uuid-${sequenceCounter}`,
    'Sequence No': `WP-000${sequenceCounter++}`,
    raised_by: mockUser.name,
    created_by: mockUser.id,
    actions: [],
    _uh: [{ s: data.status || 'DRAFT', t: nowStr(), actor: mockUser.name }],
    extension_approval_status: null,
    pdf_url: null,
    gate_pass_uuid: null,
    qr_code_url: null,
    _material_gatepass_enabled: true,
    ...resolveFormDisplayFields(data),
  };
}

const workPermitService = {
  /* ─── Statuses ─────────────────────────────────────── */
  getStatuses: () => resolve(mockStatuses),

  /* ─── Work Permits ──────────────────────────────────── */
  getAll: (params = {}) => {
    let result = [...allPermits];
    if (params.status) result = result.filter(p => p.status === params.status);
    if (params.type)   result = result.filter(p => p.type === params.type);
    if (params.search) {
      const q = params.search.toLowerCase();
      result = result.filter(p =>
        (p['Sequence No'] || '').toLowerCase().includes(q) ||
        (p.vendor_name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    return resolve(result);
  },
  getById: (id) => resolve(allPermits.find(p => p.uuid === id) || currentPermit),
  getBySequence: (seq) => resolve(allPermits.find(p => p['Sequence No'] === seq || p.uuid === seq) || currentPermit),

  create: (data) => {
    const newPermit = buildNewPermit(data);
    allPermits = [newPermit, ...allPermits];
    currentPermit = newPermit;
    return resolve(newPermit);
  },
  update: (data) => {
    currentPermit = { ...currentPermit, ...resolveFormDisplayFields(data) };
    allPermits = allPermits.map(p => p.uuid === currentPermit.uuid ? currentPermit : p);
    return resolve(currentPermit);
  },
  updateStatus: (uuid, status) => {
    const found = allPermits.find(p => p.uuid === uuid || p['Sequence No'] === uuid);
    if (found) found.status = status;
    currentPermit.status = status;
    return resolve(currentPermit);
  },

  activate: () => {
    currentPermit.status = 'ACTIVE';
    currentPermit.activated_at = nowStr();
    currentPermit.activated_by_name = mockUser.name;
    return resolve(currentPermit);
  },

  suspend: (uuid, reason) => {
    currentPermit.status = 'SUSPENDED';
    currentPermit.suspend_reason = reason;
    return resolve(currentPermit);
  },

  resume: () => {
    currentPermit.status = 'ACTIVE';
    return resolve(currentPermit);
  },

  cancel: (uuid, reason) => {
    currentPermit.status = 'CANCELLED';
    currentPermit.cancel_reason = reason;
    return resolve(currentPermit);
  },

  extend: (uuid, dueDate, reason) => {
    currentPermit.requested_due_date = dueDate;
    currentPermit.extension_reason = reason;
    currentPermit.extension_approval_status = 'PENDING';
    return resolve(currentPermit);
  },

  complete: () => {
    currentPermit.status = 'COMPLETED';
    currentPermit.completed_at = nowStr();
    currentPermit.completed_by_name = mockUser.name;
    return resolve(currentPermit);
  },

  /* ─── Material Gate Pass ────────────────────────────── */
  getMaterialGatePasses: () => resolve(gatePasses),

  createMaterialGatePass: (uuid, data) => {
    gatePasses = [
      ...gatePasses,
      {
        uuid: `gp-uuid-${gatePasses.length + 1}`,
        EntryorExit: data.direction === 'IN' ? 'In' : 'Out',
        passType: data.type === 'RETURNABLE' ? 'returnable' : 'non_returnable',
        status: 'DRAFT',
        'Sequence No': `GP-000${gatePasses.length + 5}`,
        vendor_name: currentPermit.vendor_name,
        item_count: (data.items || []).length,
        'Date Created': nowStr(),
        qr_code_url: null,
        gp_url: null,
      },
    ];
    return resolve(null);
  },

  delete: () => resolve(null),

  /* ─── Approval Flow ─────────────────────────────────── */
  getApprovalFlowConfig: () => resolve(mockApprovalFlowConfig),

  sendForApproval: () => {
    currentPermit.status = 'PENDING';
    return resolve(currentPermit);
  },

  actionApproval: ({ action, comment, level_uuid }) => {
    const level = (currentPermit.approval_levels || []).find(l => l.level?.uuid === level_uuid);
    if (level) {
      level.action = { status: action, comment, actor: mockUser.name, updated_at: nowStr() };
    }
    if (action === 'DECLINE') {
      currentPermit.status = 'DECLINED';
    } else if (action === 'REQUEST_CHANGE') {
      currentPermit.status = 'REQUEST_CHANGE';
    } else if (action === 'APPROVE') {
      const allApproved = (currentPermit.approval_levels || []).every(l => l.action?.status === 'APPROVE');
      if (allApproved) currentPermit.status = 'APPROVED';
    }
    return resolve(currentPermit);
  },

  /* ─── Dashboard ─────────────────────────────────────── */
  getStats: () => resolve([]),
  getStatsByType: () => resolve([]),
  getStatsByPriority: () => resolve([]),
  getStatsByTrend: () => resolve([]),

  /* ─── Approval Flow Setup ───────────────────────────── */
  getApprovalFlows: () => resolve(mockApprovalFlowsRaw),
  createApprovalFlow: () => resolve(null),
  deleteApprovalFlow: () => resolve(null),
  createApprovalLevel: () => resolve(null),
  updateApprovalLevel: () => resolve(null),
  deleteApprovalLevel: () => resolve(null),

  /* ─── Sequence Config ───────────────────────────────── */
  getSequenceConfig: () => resolve(null),
  saveSequenceConfig: () => resolve(null),
  createSequenceConfig: () => resolve(null),

  /* ─── Setup ─────────────────────────────────────────── */
  setup: () => resolve(null),

  /* ─── Dropdowns ─────────────────────────────────────── */
  getAssets: () => resolve(mockAssets),
  getLocations: () => resolve(mockLocationTree),
  getVendors: () => resolve(mockVendors),
  getCategories: () => resolve([]),

  searchItems: (search = '') =>
    resolve(mockItemSearchResults.filter(i => !search || i.Name.toLowerCase().includes(search.toLowerCase()))),

  getItemStock: () => resolve(mockItemStock),

  getRoles: () => resolve(mockEmployees),
  getApprovalRoles: () => resolve([]),
  getApprovalUsers: () => resolve([]),

  /* ─── PDF Templates ─────────────────────────────────── */
  getTemplates: () => resolve([]),
  createTemplate: () => resolve(null),
  updateTemplate: () => resolve(null),
  deleteTemplate: () => resolve(null),
  renderTemplate: () => resolve(null),
  setTemplateActive: () => resolve(null),

  /* ─── PDF Generate / Share ──────────────────────────── */
  generatePdf: () => {
    currentPermit.pdf_url = 'https://example.com/mock-work-permit.pdf';
    return resolve(currentPermit.pdf_url);
  },
  emailPdf: () => resolve(null),

  /* ─── Report Export ─────────────────────────────────── */
  exportReport: () => resolve(null),
};

export default workPermitService;
