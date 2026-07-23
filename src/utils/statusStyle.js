// Mirrors UtilService._statusColorMap / getStatusStyle in
// kaizen/components/version/services.js — keep colors in sync with that file.
const STATUS_COLOR_MAP = {
  OPEN:      { color: '#e6a800', text: '#212529' },
  STARTED:   { color: '#007bff', text: '#fff'    },
  HOLD:      { color: '#fd7e14', text: '#fff'    },
  COMPLETED: { color: '#28a745', text: '#fff'    },
  CANCELLED: { color: '#dc3545', text: '#fff'    },
  REOPEN:    { color: '#6f42c1', text: '#fff'    },
  OVERDUE:   { color: '#dc3545', text: '#fff'    },
  MISSED:    { color: '#495057', text: '#fff'    },
  // Work Permit statuses
  DRAFT:          { color: '#adb5bd', text: '#212529' },
  PENDING:        { color: '#ffc107', text: '#212529' },
  APPROVED:       { color: '#28a745', text: '#fff'    },
  ACTIVE:         { color: '#007bff', text: '#fff'    },
  DECLINED:       { color: '#a3153b', text: '#fff'    },
  REQUEST_CHANGE: { color: '#fd7e14', text: '#fff'    },
  SUSPENDED:      { color: '#6f42c1', text: '#fff'    },
  EXPIRED:        { color: '#212529', text: '#fff'    },
  // Material Gate Pass status (WP-GP-02) — RELEASED = confirmed at gate
  RELEASED:       { color: '#10B981', text: '#fff'    },
  // Work Permit _uh history entries (check-in/out events)
  CHECK_IN:       { color: '#10B981', text: '#fff'    },
  CHECK_OUT:      { color: '#17A2B8', text: '#fff'    },
};

// mode: 'bg' | 'outline' | 'selected'
// 'bg'       - filled badge (list items, inline labels)
// 'outline'  - border + coloured text, no fill  (idle filter buttons)
// 'selected' - filled + shadow ring             (active filter buttons)
export function getStatusStyle(status, mode) {
  const entry = STATUS_COLOR_MAP[status];
  if (!entry) return {};
  const { color: c, text: t } = entry;
  if (mode === 'outline') {
    return { backgroundColor: 'transparent', border: `1px solid ${c}`, color: c };
  }
  if (mode === 'selected') {
    return { backgroundColor: c, color: t, border: `2px solid ${c}`, boxShadow: `0 0 0 3px ${c}55` };
  }
  return { backgroundColor: c, color: t };
}

export function getStatusColor(status) {
  return STATUS_COLOR_MAP[status]?.color || '#6c757d';
}
