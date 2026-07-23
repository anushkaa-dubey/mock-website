// FAKE scaffolding for the UI mock sandbox — not part of the real repo.
// Same function names as the real src/services/formService.js, resolving
// fixture data instead of hitting the forms API. Do NOT copy this file back.

import { mockForms } from '@/fixtures';

function resolve(data, status = 'success', delay = 200) {
  return new Promise((res) => setTimeout(() => res({ data: { status, data } }), delay));
}

const formService = {
  getForms: () => resolve(mockForms),
  getGlobalForms: () => resolve(mockForms),
  getFormByType: (type) =>
    resolve(mockForms.filter(f => (f.tag || f.type) === type)),
  addForm: () => resolve(null),
  updateForm: () => resolve(null),
  deleteForm: () => resolve(null),
  cloneGlobalForms: () => resolve(null),

  getFieldsByType: () => resolve([]),
  getFieldsByFormId: () => resolve([]),
  addField: () => resolve(null),
  updateField: () => resolve(null),
  deleteField: () => resolve(null),
};

export default formService;
