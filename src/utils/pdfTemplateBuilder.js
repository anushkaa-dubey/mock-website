import { createMockWorkPermit, mockForms } from '@/fixtures';

/**
 * Builds a dynamic HTML representation of a Work Permit PDF template
 * using fixture data or provided work permit and form definitions.
 *
 * @param {Object} [wp=createMockWorkPermit()] - The work permit data object.
 * @param {Array} [forms=mockForms] - The dynamic forms list.
 * @returns {string} Clean HTML template string.
 */
export function buildPdfTemplate(wp = createMockWorkPermit(), forms = mockForms) {
  if (!wp) return '';

  const permitTypeFormatted = (wp.type || '')
    .replace(/^WORK_PERMIT_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  // Find matching form for dynamic fields
  const currentForm = forms?.find((f) => f.type === wp.type || f.tag === wp.type) || forms?.[0];

  // Resolve dynamic fields using form field definitions
  const dynamicFieldEntries = [];
  const handledKeys = new Set();

  if (currentForm && Array.isArray(currentForm.fields)) {
    currentForm.fields.forEach((field) => {
      handledKeys.add(field.col_name);
      const rawValue = wp.dynamic_fields?.[field.col_name];
      let displayValue = '—';

      if (typeof rawValue === 'boolean') {
        displayValue = rawValue ? 'Yes' : 'No';
      } else if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        displayValue = String(rawValue);
      }

      dynamicFieldEntries.push({
        label: field.name || field.col_name,
        value: displayValue,
      });
    });
  }

  // Include any extra dynamic fields present in wp.dynamic_fields not covered by form
  if (wp.dynamic_fields && typeof wp.dynamic_fields === 'object') {
    Object.entries(wp.dynamic_fields).forEach(([key, val]) => {
      if (!handledKeys.has(key)) {
        let displayValue = '—';
        if (typeof val === 'boolean') {
          displayValue = val ? 'Yes' : 'No';
        } else if (val !== undefined && val !== null && val !== '') {
          displayValue = String(val);
        }
        dynamicFieldEntries.push({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: displayValue,
        });
      }
    });
  }

  // Resolve approval levels
  const approvalEntries = (wp.approval_levels || []).map((lvl, index) => {
    const levelNumber = lvl.level?.level || index + 1;
    const roleName = lvl.level?.Name || `Level ${levelNumber}`;
    const approverName = lvl.actor_name || lvl.action?.actor || lvl.approver_name || 'Pending Approver';
    const status = lvl.action?.status || 'PENDING';
    const date = lvl.action?.updated_at || '—';
    const comment = lvl.action?.comment || '—';

    return {
      level: `Level ${levelNumber}`,
      role: roleName,
      approver: approverName,
      status,
      date,
      comment,
    };
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Work Permit - ${wp['Sequence No'] || 'WP'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
      background-color: #f9fafb;
    }
    .wp-document {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .wp-header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 16px;
    }
    .wp-title {
      font-size: 22px;
      font-weight: 700;
      color: #0066cc;
      margin: 0 0 4px 0;
    }
    .wp-subtitle {
      font-size: 13px;
      color: #4b5563;
      margin: 0;
    }
    .wp-badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-status {
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .badge-priority {
      background-color: #fff7ed;
      color: #c2410c;
      border: 1px solid #fed7aa;
      margin-left: 6px;
    }
    .wp-section-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 8px 12px;
      margin: 20px 0 10px 0;
      border-radius: 4px;
    }
    .wp-grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .wp-grid-table td {
      padding: 7px 10px;
      vertical-align: top;
      border: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .wp-label {
      width: 25%;
      font-weight: 600;
      color: #475569;
      background-color: #f8fafc;
    }
    .wp-value {
      width: 25%;
      color: #0f172a;
    }
    .wp-data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 14px;
    }
    .wp-data-table th {
      background-color: #f8fafc;
      color: #334155;
      font-weight: 600;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
      font-size: 12px;
    }
    .wp-data-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .wp-data-table tr:nth-child(even) {
      background-color: #fcfcfd;
    }
    .status-pill-approved {
      color: #047857;
      font-weight: 600;
    }
    .status-pill-pending {
      color: #b45309;
      font-weight: 600;
    }
    .status-pill-declined {
      color: #b91c1c;
      font-weight: 600;
    }
    .wp-footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wp-document">
    <table class="wp-header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="wp-title">WORK PERMIT</h1>
          <p class="wp-subtitle">${permitTypeFormatted} · ${wp['Sequence No'] || '—'}</p>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div>
            <span class="wp-badge badge-status">${wp.status || 'DRAFT'}</span>
            ${wp.priority ? `<span class="wp-badge badge-priority">${wp.priority} Priority</span>` : ''}
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
            Raised By: <strong style="color: #1e293b;">${wp.raised_by || '—'}</strong>
          </div>
        </td>
      </tr>
    </table>

    <div class="wp-section-title">Permit Schedule & Details</div>
    <table class="wp-grid-table">
      <tr>
        <td class="wp-label">Permit No.</td>
        <td class="wp-value">${wp['Sequence No'] || '—'}</td>
        <td class="wp-label">Permit Type</td>
        <td class="wp-value">${permitTypeFormatted}</td>
      </tr>
      <tr>
        <td class="wp-label">Scheduled Date</td>
        <td class="wp-value">${wp['Scheduled Date'] || '—'}</td>
        <td class="wp-label">Start Time</td>
        <td class="wp-value">${wp.start_time || '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">Due Date & Time</td>
        <td class="wp-value">${wp['Due Date'] || '—'}</td>
        <td class="wp-label">Work Duration</td>
        <td class="wp-value">${wp.period_of_work ? `${wp.period_of_work} Hours` : '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">LOTO Reference</td>
        <td class="wp-value">${wp.loto_no || '—'}</td>
        <td class="wp-label">Attended By</td>
        <td class="wp-value">${wp.attended_by_name || '—'}</td>
      </tr>
    </table>

    <div class="wp-section-title">Location & Asset Details</div>
    <table class="wp-grid-table">
      <tr>
        <td class="wp-label">Location</td>
        <td class="wp-value">${wp.location_name || '—'}</td>
        <td class="wp-label">Asset Name</td>
        <td class="wp-value">${wp.asset_name || '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">Asset Sequence No.</td>
        <td class="wp-value">${wp.asset_seq || '—'}</td>
        <td class="wp-label">Asset Category</td>
        <td class="wp-value">${wp.asset_category || '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">Asset Plant/Location</td>
        <td class="wp-value">${wp.asset_location_name || '—'}</td>
        <td class="wp-label">NFC Tag Reference</td>
        <td class="wp-value">${wp.asset_nfc_tag || '—'}</td>
      </tr>
      ${wp.asset_description ? `
      <tr>
        <td class="wp-label">Asset Description</td>
        <td class="wp-value" colspan="3">${wp.asset_description}</td>
      </tr>` : ''}
    </table>

    <div class="wp-section-title">Vendor & Personnel Details</div>
    <table class="wp-grid-table">
      <tr>
        <td class="wp-label">Vendor Name</td>
        <td class="wp-value">${wp.vendor_name || '—'}</td>
        <td class="wp-label">Contact Person</td>
        <td class="wp-value">${wp.vendor_contact_name || '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">Vendor Email</td>
        <td class="wp-value">${wp.vendor_email || '—'}</td>
        <td class="wp-label">Vendor Mobile</td>
        <td class="wp-value">${wp.vendor_mobile || '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">Personnel Count</td>
        <td class="wp-value" colspan="3">${wp.no_of_persons ? `${wp.no_of_persons} Personnel` : '—'}</td>
      </tr>
    </table>

    <div class="wp-section-title">Scope of Work & Safety Measures</div>
    <table class="wp-grid-table">
      <tr>
        <td class="wp-label">Work Description</td>
        <td class="wp-value" colspan="3">${wp.description || '—'}</td>
      </tr>
      <tr>
        <td class="wp-label">Work to be Carried Out</td>
        <td class="wp-value" colspan="3">${wp.work_to_be_carried || '—'}</td>
      </tr>
    </table>

    ${dynamicFieldEntries.length > 0 ? `
    <div class="wp-section-title">Permit-Specific Details & Safety Checklist</div>
    <table class="wp-data-table">
      <thead>
        <tr>
          <th style="width: 45%;">Parameter / Field</th>
          <th style="width: 55%;">Value / Status</th>
        </tr>
      </thead>
      <tbody>
        ${dynamicFieldEntries.map((item) => `
        <tr>
          <td><strong>${item.label}</strong></td>
          <td>${item.value}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    ${approvalEntries.length > 0 ? `
    <div class="wp-section-title">Approval Hierarchy & Sign-off History</div>
    <table class="wp-data-table">
      <thead>
        <tr>
          <th style="width: 15%;">Level</th>
          <th style="width: 25%;">Role / Designation</th>
          <th style="width: 20%;">Approver</th>
          <th style="width: 15%;">Status</th>
          <th style="width: 25%;">Updated At / Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${approvalEntries.map((item) => `
        <tr>
          <td><strong>${item.level}</strong></td>
          <td>${item.role}</td>
          <td>${item.approver}</td>
          <td>
            <span class="${
              item.status === 'APPROVE' || item.status === 'APPROVED'
                ? 'status-pill-approved'
                : item.status === 'DECLINE' || item.status === 'DECLINED'
                ? 'status-pill-declined'
                : 'status-pill-pending'
            }">
              ${item.status}
            </span>
          </td>
          <td>
            <div>${item.date}</div>
            ${item.comment && item.comment !== '—' ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px;">"${item.comment}"</div>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div class="wp-footer">
      Generated automatically by FacTech CAFM Work Permit System · Sequence: ${wp['Sequence No'] || '—'} · Status: ${wp.status || 'DRAFT'}
    </div>
  </div>
</body>
</html>`;
}