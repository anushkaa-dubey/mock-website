import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import workPermitService from '@/services/workPermitService';
import formService from '@/services/formService';
import { useApp, savePermitTypesCache } from '@/context/AppContext';

const FEATURES = [
  { icon: 'fa-file-text',   label: 'Raise Work Permits',       desc: '12 permit types with dynamic forms' },
  { icon: 'fa-check-circle', label: 'Approval Workflows',       desc: 'Multi-level approval with actions' },
  { icon: 'fa-shield',      label: 'Risk Assessments',          desc: 'Hazard checklist per permit type' },
  { icon: 'fa-qrcode',      label: 'Gate Pass & QR Access',     desc: 'Vendor access with QR scanning' },
];

export default function GetStarted() {
  const navigate   = useNavigate();
  const { siteId } = useParams();
  const { setPermitTypes, setWorkPermitSetupRequired } = useApp();

  const [loading,        setLoading]        = useState(false);
  const [setupMessages,  setSetupMessages]  = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');

  const addMessage = (msg) =>
    setSetupMessages(prev => [...prev, msg]);

  const onGetStarted = async () => {
    setLoading(true);

    try {
      setLoadingMessage('Setting up Work Permit module...');
      await workPermitService.setup();
      addMessage('Work Permit module configured');

      // Clone all global forms of type WORK_PERMIT in one call.
      // The backend queries WHERE type = 'WORK_PERMIT' at society_id = 0,
      // which returns all permit type variants and replicates them for this site.
      setLoadingMessage('Loading default permit type forms...');
      const cloneRes = await formService.cloneGlobalForms(['WORK_PERMIT']);
      const successes = cloneRes.data?.data?.successes || [];
      const errors    = cloneRes.data?.data?.errors    || {};
      const errorCount = Object.keys(errors).length;

      if (successes.length === 0 && errorCount > 0) {
        setLoadingMessage('Setup incomplete: global permit type templates not found. Please contact support.');
        setLoading(false);
        return;
      }

      const types = successes.map(f => ({ label: f.name, value: f.tag || f.type }));
      setPermitTypes(types);
      savePermitTypesCache(siteId, types);
      setWorkPermitSetupRequired(false);
      addMessage(`${successes.length} default permit type form(s) loaded`);

      addMessage('Setup complete!');
      setLoadingMessage('Redirecting to dashboard...');
      navigate(`/site/${siteId}/dashboard`);
    } catch (err) {
      console.error('Setup failed', err);
      setLoadingMessage('Setup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="get-started">
      <div className="get-started-display text-center" style={{ width: '100%', maxWidth: 760, padding: '0 24px' }}>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(23,162,184,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <i className="fa fa-shield" style={{ fontSize: 32, color: '#17a2b8' }} />
        </div>

        {/* Title */}
        <h1 className="disp-text-xl text-capitalize" style={{ fontSize: 72, lineHeight: 1 }}>
          Work Permit
        </h1>

        {/* Tagline */}
        <p style={{ fontSize: 15, color: '#6c757d', maxWidth: 480, margin: '12px auto 32px' }}>
          <strong>&quot;Safety First&quot;</strong> — Manage work permits, risk assessments and
          safety procedures to protect your workforce and assets.
        </p>

        {/* Feature cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
          marginBottom: 36, textAlign: 'left',
        }}>
          {FEATURES.map(f => (
            <div key={f.icon} style={{
              background: '#fff', border: '1px solid #f0f0f0',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(23,162,184,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <i className={`fa ${f.icon}`} style={{ color: '#17a2b8', fontSize: 15 }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>{f.label}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          className={`btn btn-primary-dark px-5 py-3 text-white${!loading ? ' btn-get-started' : ''}`}
          onClick={onGetStarted}
          disabled={loading}
          style={{ fontSize: 15, letterSpacing: 1 }}
        >
          {loading
            ? <><i className="fa fa-cog fa-spin me-2" />Setting up...</>
            : 'GET STARTED'}
        </button>

        {/* Setup progress */}
        {(setupMessages.length > 0 || (loading && loadingMessage)) && (
          <div className="mt-4 font-monospace" style={{ fontSize: 13, color: '#6c757d' }}>
            {setupMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <i className="fa fa-check text-success me-2" />{m}
              </div>
            ))}
            {loading && loadingMessage && (
              <p className="mt-2 mb-0">
                <i className="fa fa-cog fa-spin me-2" />{loadingMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
