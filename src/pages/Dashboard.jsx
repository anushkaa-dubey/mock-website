import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workPermitService from '@/services/workPermitService';
import DynamicDashboard from '@/components/dashboard/DynamicDashboard';
import { useApp } from '@/context/AppContext';
import { getStatusColor } from '@/utils/statusStyle';

function statusLabel(s) {
  return (s || '').split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts.includes('Z') || ts.includes('+') ? ts : ts + ' UTC').getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const { siteId }      = useParams();
  const navigate        = useNavigate();
  const { permitTypes } = useApp();

  const [activity,     setActivity]     = useState([]);
  const [activityLoad, setActivityLoad] = useState(true);

  useEffect(() => {
    setActivityLoad(true);
    workPermitService.getAll({ per_page: 10, page_no: 1 })
      .then(r => setActivity(r.data?.data || []))
      .catch(() => {})
      .finally(() => setActivityLoad(false));
  }, [siteId]);

  return (
    <div>
      <div className="row gx-3 align-items-start">

        {/* ── LEFT: Dynamic grid dashboard ─────────────────────────────── */}
        <div className="col-12 col-xxl-9">
          <DynamicDashboard siteId={siteId} />
        </div>

        {/* ── RIGHT: Latest Activity ───────────────────────────────────── */}
        <div className="col-12 col-xxl-3 mt-3 mt-xxl-0">
          <div className="container-rounded-white wp-dashboard-activity">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <div className="dash-chart-title" style={{ fontSize: 13 }}>Latest Activity</div>
                <div className="dash-chart-sub">Recent permit updates</div>
              </div>
              <button className="btn btn-primary-dark btn-sm" onClick={() => navigate(`/site/${siteId}/work-permit/new`)}>
                <i className="fa fa-plus" />
              </button>
            </div>

            {activityLoad
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f3f5', alignItems: 'center' }}>
                  <span className="dash-stat-skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span className="dash-stat-skeleton" style={{ width: '70%', height: 12, display: 'block', marginBottom: 4 }} />
                    <span className="dash-stat-skeleton" style={{ width: '40%', height: 10 }} />
                  </div>
                </div>
              ))
              : activity.length === 0
                ? <div className="text-muted text-center py-4" style={{ fontSize: 13 }}><i className="fa fa-inbox fa-2x mb-2 d-block" />No permits yet</div>
                : activity.map(p => {
                  const statusKey = (p.status || '').toUpperCase();
                  const meta = { label: statusLabel(statusKey), color: getStatusColor(statusKey) };
                  return (
                    <div key={p.uuid}
                      onClick={() => navigate(`/site/${siteId}/work-permit/${p["Sequence No"]}`)}
                      style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #f8f9fa', alignItems: 'flex-start', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: meta.color + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <i className="fa fa-file-text" style={{ color: meta.color, fontSize: 14 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p["Sequence No"] || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {permitTypes.find(t => t.value === p.type)?.label || p.type || '—'}
                        </div>
                        <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, background: meta.color + '18', color: meta.color, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: 10, color: '#adb5bd' }}>{timeAgo(p.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
            }

            {activity.length > 0 && (
              <div style={{ paddingTop: 10, textAlign: 'center' }}>
                <button className="btn btn-outline-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => navigate(`/site/${siteId}/work-permit`)}>
                  View All <i className="fa fa-arrow-right ms-1" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
