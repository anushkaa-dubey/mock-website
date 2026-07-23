// FAKE scaffolding for the UI mock sandbox — not part of the real repo.
// The real src/services/services.js creates axios instances and reads auth
// from localStorage. Here everything is synchronous/in-memory so the intern
// never needs a backend or login flow. Do NOT copy this file back.

import { mockUser } from '@/fixtures';
import {
  mockWpStatusDefs,
  mockWpStats,
  mockWpStatsByType,
  mockWpStatsByPriority,
  mockWpStatsTrend,
  createMockUpcomingPermits,
} from '@/fixtures';

// The dashboard widgets in src/dashboard-widgets/*.html are the same files
// DynamicDashboard.jsx normally gets back from `ismApi.get('my/dashboardmodules')`
// (stored in a database in the real app). Importing with `?raw` inlines their
// text as-is — edit those files and refresh the browser to see changes.
import wpStatusSummaryHtml from '@/dashboard-widgets/wp-status-summary.html?raw';
import wpByTypeHtml        from '@/dashboard-widgets/wp-by-type.html?raw';
import wpByPriorityHtml    from '@/dashboard-widgets/wp-by-priority.html?raw';
import wpTrendHtml         from '@/dashboard-widgets/wp-trend.html?raw';
import wpUpcomingHtml      from '@/dashboard-widgets/wp-upcoming.html?raw';

function getLoggedInUser() {
  return mockUser;
}

function getSiteId() {
  return mockUser.societyId;
}

function getSiteUuid() {
  return mockUser.society.uuid;
}

function getActiveGroupId() {
  return mockUser.role_id;
}

function redirectToLogin() {
  // no-op in the mock sandbox — there's nothing to redirect to.
}

function delay(data, ms = 200) {
  return new Promise((res) => setTimeout(() => res(data), ms));
}

/* ─── Fake ppmApi: routes the raw endpoint strings the dashboard widgets
   call directly via `fetchData(uri)` (see DynamicDashboard.jsx) ────────── */
function ppmApiGet(uri) {
  const path = String(uri).split('?')[0];

  if (path.endsWith('/stats/type'))     return delay({ data: { status: 'success', data: mockWpStatsByType } });
  if (path.endsWith('/stats/priority')) return delay({ data: { status: 'success', data: mockWpStatsByPriority } });
  if (path.endsWith('/stats/trend'))    return delay({ data: { status: 'success', data: mockWpStatsTrend } });
  if (path.endsWith('/stats'))          return delay({ data: { status: 'success', data: mockWpStats } });
  if (path.startsWith('v3/wp/status'))  return delay({ data: { status: 'success', data: mockWpStatusDefs } });
  if (/\/workpermit$/.test(path) || path.includes('/workpermit?'))
    return delay({ data: { status: 'success', data: createMockUpcomingPermits() } });

  return delay({ data: { status: 'success', data: [] } });
}

const WP_WIDGETS = [
  { id: 1, code: 'WP_STATUS_SUMMARY', name: 'Work Permit Summary',  html: wpStatusSummaryHtml },
  { id: 2, code: 'WP_BY_TYPE',        name: 'Work Permits by Type', html: wpByTypeHtml },
  { id: 3, code: 'WP_BY_PRIORITY',    name: 'By Priority',          html: wpByPriorityHtml },
  { id: 4, code: 'WP_TREND',          name: 'Monthly Trend',        html: wpTrendHtml },
  { id: 5, code: 'WP_UPCOMING',       name: 'Upcoming',             html: wpUpcomingHtml },
].map(w => ({ ...w, active: 1, chart_type: 'ang-react' }));

function fakeApi(kind) {
  return {
    defaults: { baseURL: 'mock://api/' },
    get: (uri) => {
      if (kind === 'ism' && String(uri).includes('my/dashboardmodules')) {
        return delay({
          data: {
            status: 'success',
            data: { modules: { 1: { name: 'Work Permit', module_components: WP_WIDGETS } } },
          },
        });
      }
      if (kind === 'ppm') return ppmApiGet(uri);
      return delay({ data: { status: 'success', data: [] } });
    },
    post: () => delay({ data: { status: 'success', data: null } }),
    put: () => delay({ data: { status: 'success', data: null } }),
    delete: () => delay({ data: { status: 'success', data: null } }),
  };
}

const ppmApi = fakeApi('ppm');
const formApi = fakeApi('form');
const ismApi = fakeApi('ism');

export { ppmApi, formApi, ismApi, getSiteId, getSiteUuid, getLoggedInUser, getActiveGroupId, redirectToLogin };
