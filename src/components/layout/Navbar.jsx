import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { redirectToLogin } from '@/services/services';

const FALLBACK_LOGO = 'https://app.factech.co.in/fronts/images/Final_Logo_grey.png';
const USER_FALLBACK_IMAGE = `${import.meta.env.BASE_URL}images/user.png`;
const EMPTY_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function withBasePath(src) {
  if (!src || /^https?:\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  if (src.startsWith('/images/')) {
    return `${import.meta.env.BASE_URL}${src.slice(1)}`;
  }

  return src;
}

function handleImageFallback(event, fallbackSrc) {
  const img = event.currentTarget;

  if (img.dataset.fallbackApplied === 'true') {
    img.src = EMPTY_IMAGE;
    return;
  }

  img.dataset.fallbackApplied = 'true';
  img.src = fallbackSrc;
}

export default function Navbar({ onMenuClick }) {
  const { loggedInUser, site, loading } = useApp();

  const [sites,      setSites]      = useState([]);
  const [search,     setSearch]     = useState('');
  const [dropOpen,   setDropOpen]   = useState(false);
  const dropRef = useRef(null);
  const location = useLocation();
  const isSetup = location.pathname.includes('/setup');
  const sequenceMatch = location.pathname.match(/\/work-permit\/([^/]+)$/);
  const wpSequence = sequenceMatch ? sequenceMatch[1] : null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ngStorage-ppm_sites');
      if (raw) setSites(Object.values(JSON.parse(raw)));
    } catch {}
  }, []);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSiteSwitch = (newSite) => {
    try {
      const key  = localStorage.getItem('loggedinUser') ? 'loggedinUser' : 'loggedinUserIndex';
      const user = JSON.parse(localStorage.getItem(key));
      user.societyId = newSite.id;
      localStorage.setItem(key, JSON.stringify(user));
      const uuid = newSite.ppm_site?.uuid;
      if (uuid) localStorage.setItem('siteUuid', uuid);
      else      localStorage.removeItem('siteUuid');
    } catch {}
    // Hash-only changes don't trigger a full page reload, so update the hash
    // then explicitly reload so AppContext re-initialises with the new site.
    window.location.hash = `#/site/${newSite.id}/dashboard`;
    window.location.reload();
  };

  const handleLogout = () => { localStorage.clear(); redirectToLogin(); };

  const filtered = sites.filter(s =>
    !search || `${s.name} ${s.id}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <nav className="top-navbar" style={{ padding: '0 12px' }}>
      {/* Mobile hamburger */}
      <button type="button" className="btn btn-none d-lg-none me-2 p-1" onClick={onMenuClick} aria-label="Toggle menu" style={{ flexShrink: 0 }}>
        <i className="fa fa-bars" style={{ fontSize: 18, color: '#555' }} />
      </button>

      {/* Site switcher dropdown */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button
          className="btn btn-none d-flex align-items-center gap-2 pe-1"
          onClick={() => { setSearch(''); setDropOpen(o => !o); }}
          style={{ maxWidth: 260 }}
        >
          <img
            src={withBasePath(site?.sd?.logo) || FALLBACK_LOGO}
            height="26"
            alt="site logo"
            style={{ flexShrink: 0, objectFit: 'contain' }}
            onError={e => handleImageFallback(e, FALLBACK_LOGO)}
          />
          <div className="d-flex align-items-center d-sm-none">
            <span className="fw-semibold text-start lh-sm" style={{ fontSize: 10.5, color: '#64748B', whiteSpace: 'normal', width: 34 }}>
              Select Site
            </span>
            <i className="fa fa-caret-down ms-1" style={{ fontSize: 10, color: '#64748B', flexShrink: 0 }} />
          </div>
          <div className="d-none d-sm-flex align-items-center">
            <span className="text-truncate fw-semibold" style={{ fontSize: 14, maxWidth: 180 }}>
              {site?.name || 'Select Site'}
            </span>
            <i className="fa fa-caret-down ms-1" style={{ fontSize: 11, color: '#888', flexShrink: 0 }} />
          </div>
        </button>

        {dropOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 9999,
            background: '#fff', border: '1px solid #dee2e6', borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 280, maxWidth: 340,
          }}>
            {/* Search */}
            <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <i className="fa fa-search" style={{ color: '#adb5bd', fontSize: 13 }} />
              <input
                autoFocus
                type="text"
                className="form-control form-control-sm border-0 p-0 shadow-none"
                placeholder="Search..."
                style={{ background: 'transparent', fontSize: 13 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Site list */}
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div className="text-center text-muted py-3" style={{ fontSize: 13 }}>No sites found</div>
              )}
              {filtered.map(s => {
                const isActive = s.id === site?.id;
                return (
                  <button
                    key={s.id}
                    className="btn btn-none w-100 text-start px-3 py-2 d-flex align-items-center gap-2"
                    style={{
                      background: isActive ? 'rgba(23,162,184,0.07)' : 'transparent',
                      borderBottom: '1px solid #f8f9fa',
                      borderRadius: 0,
                    }}
                    onClick={() => { setDropOpen(false); if (!isActive) handleSiteSwitch(s); }}
                  >
                    <img
                      src={withBasePath(s.sd?.logo) || FALLBACK_LOGO}
                      height="24"
                      alt=""
                      style={{ width: 36, objectFit: 'contain', flexShrink: 0 }}
                      onError={e => handleImageFallback(e, FALLBACK_LOGO)}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className="text-truncate" style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#17a2b8' : '#212529' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#adb5bd' }}>{s.id}</div>
                    </div>
                    {isActive && <i className="fa fa-check ms-auto text-primary-dark" style={{ fontSize: 11 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Service title */}
      <div className="d-flex flex-column lh-sm ms-2" style={{ flexShrink: 0 }}>
        <span className="fw-bold" style={{ fontSize: 12, color: '#0B4A54' }}>
          Work Permit /
        </span>
        <span className="fw-bold" style={{ fontSize: 12, color: '#00B8A9' }}>
          {isSetup ? <span style={{ color: '#6B7280', fontWeight: 600 }}>Setup</span> : wpSequence || ''}
        </span>
      </div>

      {/* Right side */}
      <div className="ms-auto d-flex align-items-center">
        <div className="dropdown">
          <button className="btn btn-none dropdown-toggle d-flex align-items-center gap-1" data-bs-toggle="dropdown">
            {loggedInUser?.image_src ? (
               <img src={withBasePath(loggedInUser.image_src)} width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} onError={e => handleImageFallback(e, USER_FALLBACK_IMAGE)} alt="User" />
            ) : (
               <div className="d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, borderRadius: '50%', background: '#E0E7FF', color: '#3730A3', fontWeight: 600, fontSize: 11 }}>
                 {loggedInUser?.name ? loggedInUser.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'DI'}
               </div>
            )}
            <div className="d-flex align-items-center ms-1 d-sm-none">
              <span className="fw-semibold text-start lh-sm" style={{ fontSize: 10.5, color: '#64748B', whiteSpace: 'normal', width: 34 }}>
                {loggedInUser?.name ? loggedInUser.name.split(' ').join(' ') : 'Dev Intern'}
              </span>
            </div>
            <span style={{ fontSize: 13 }} className="d-none d-sm-inline ms-1 fw-semibold text-secondary">{loggedInUser?.name || 'Dev Intern'}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end" style={{ minWidth: 240 }}>
            <li className="px-3 py-2" style={{ background: '#17a2b8', color: '#fff' }}>
              <div className="fw-semibold">{loggedInUser?.name}</div>
              <small>{loggedInUser?.designation_name}</small>
              <div style={{ fontSize: 12 }}><i className="fa fa-envelope-o me-1" />{loggedInUser?.email}</div>
              {site && <div style={{ fontSize: 12 }}><i className="fa fa-sitemap me-1" />{site.name}</div>}
            </li>
            <li>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="fa fa-power-off me-2" />Logout
              </button>
            </li>
          </ul>
        </div>
      </div>

      {loading && (
        <div className="progress-bar-container">
          <div className="progress-bar bg-info progress-bar-striped progress-bar-animated" style={{ width: '100%', height: '3px' }} />
        </div>
      )}
    </nav>
  );
}
