import { ppmApi, getLoggedInUser, getActiveGroupId } from '@/services/services';

const KAIZEN_APP_URL = import.meta.env.VITE_KAIZEN_APP_URL || 'http://localhost:8000/kaizen';

function generateProgressId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'progress-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function buildAuthQuery() {
  const user = getLoggedInUser();
  if (!user) return '';
  const params = {
    'api-token': user.api_token,
    'user-id': user.id,
    site_id: user.societyId,
    'group-id': getActiveGroupId(),
  };
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/**
 * Opens Kaizen's shared progress-bar.html popup and kicks off an async,
 * progress-tracked backend job. The popup polls the backend itself via
 * v4/getProgressDetails — this just hands it the config it needs and fires
 * the triggering request.
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.subtitle
 * @param {Array<{label:string,value:string}>} [opts.details]
 * @param {(progressId: string) => Promise} opts.requestFn - fires the job-starting request
 */
export function openProgressReport({ title, subtitle, details = [], requestFn }) {
  const progressId = generateProgressId();
  const progressBase = `${ppmApi.defaults.baseURL}v4/getProgressDetails`;
  const authQuery = buildAuthQuery();

  const popupUrl = `${KAIZEN_APP_URL}/progress/progress-bar.html?progressId=${encodeURIComponent(progressId)}`;
  const popup = window.open(popupUrl, '_blank');
  if (popup && popup.focus) popup.focus();

  const config = { progressBase, authQuery, title, subtitle, details, cache: false };

  const onMessage = (ev) => {
    const data = ev?.data;
    if (!data || data.progressId !== progressId) return;
    if (data.type === 'report-config-request') {
      popup?.postMessage({ type: 'report-config', progressId, config }, '*');
    } else if (['report-cancel', 'report-closed', 'report-finished', 'report-error'].includes(data.type)) {
      window.removeEventListener('message', onMessage);
    }
  };
  window.addEventListener('message', onMessage);

  requestFn(progressId).catch(() => {
    popup?.postMessage({ type: 'report-error', progressId, message: 'Failed to start report.' }, '*');
  });

  return progressId;
}
