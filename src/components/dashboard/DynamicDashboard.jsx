import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';

const ResponsiveGridLayout = WidthProvider(Responsive);
import Chart from 'chart.js/auto';
import workPermitService from '@/services/workPermitService';
import { ppmApi, ismApi } from '@/services/services';

/* ── Deterministic grid layouts per container breakpoint ─────────────── */
const DEFAULT_POSITIONS = {
  lg: {
    WP_STATUS_SUMMARY: { x: 0, y: 0,  w: 12, h: 3 },
    WP_BY_TYPE:        { x: 0, y: 3,  w: 7,  h: 7 },
    WP_BY_PRIORITY:    { x: 7, y: 3,  w: 5,  h: 7 },
    WP_TREND:          { x: 0, y: 10, w: 8,  h: 7 },
    WP_UPCOMING:       { x: 8, y: 10, w: 4,  h: 7 },
  },
  md: {
    WP_STATUS_SUMMARY: { x: 0, y: 0,  w: 10, h: 3 },
    WP_BY_TYPE:        { x: 0, y: 3,  w: 6,  h: 7 },
    WP_BY_PRIORITY:    { x: 6, y: 3,  w: 4,  h: 7 },
    WP_TREND:          { x: 0, y: 10, w: 6,  h: 7 },
    WP_UPCOMING:       { x: 6, y: 10, w: 4,  h: 7 },
  },
  sm: {
    WP_STATUS_SUMMARY: { x: 0, y: 0,  w: 6, h: 4 },
    WP_BY_TYPE:        { x: 0, y: 4,  w: 6, h: 7 },
    WP_BY_PRIORITY:    { x: 0, y: 11, w: 3, h: 7 },
    WP_UPCOMING:       { x: 3, y: 11, w: 3, h: 7 },
    WP_TREND:          { x: 0, y: 18, w: 6, h: 7 },
  },
  xs: {
    WP_STATUS_SUMMARY: { x: 0, y: 0,  w: 4, h: 5 },
    WP_BY_TYPE:        { x: 0, y: 5,  w: 4, h: 7 },
    WP_BY_PRIORITY:    { x: 0, y: 12, w: 4, h: 7 },
    WP_TREND:          { x: 0, y: 19, w: 4, h: 7 },
    WP_UPCOMING:       { x: 0, y: 26, w: 4, h: 7 },
  },
  xxs: {
    WP_STATUS_SUMMARY: { x: 0, y: 0,  w: 2, h: 6 },
    WP_BY_TYPE:        { x: 0, y: 6,  w: 2, h: 7 },
    WP_BY_PRIORITY:    { x: 0, y: 13, w: 2, h: 7 },
    WP_TREND:          { x: 0, y: 20, w: 2, h: 7 },
    WP_UPCOMING:       { x: 0, y: 27, w: 2, h: 7 },
  },
};

const BREAKPOINT_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

function defaultLayouts(components) {
  return Object.fromEntries(Object.entries(BREAKPOINT_COLS).map(([breakpoint, cols]) => {
    const positions = DEFAULT_POSITIONS[breakpoint];
    let fallbackY = Math.max(...Object.values(positions).map(pos => pos.y + pos.h));
    const layout = components.map(c => {
      const pos = positions[c.code] || { x: 0, y: fallbackY, w: cols, h: 7 };
      if (!positions[c.code]) fallbackY += 7;
      return {
        i: String(c.id),
        ...pos,
        minH: c.code === 'WP_STATUS_SUMMARY' ? 3 : 4,
        minW: Math.min(pos.w, breakpoint === 'lg' || breakpoint === 'md' ? 3 : 2),
      };
    });
    return [breakpoint, layout];
  }));
}

/* ── fetchData passed to eval'd components ─────────────────────────────── */
function makeFetchData() {
  return function fetchData(uri) {
    return ppmApi.get(uri).then(r => r.data);
  };
}

/* ── Single eval'd component renderer ─────────────────────────────────── */
function DynamicComponent({ code, componentId, isEdit }) {
  const containerRef = useRef(null);
  const mountRef     = useRef(null); // { root, node } for the active inner mount
  const fetchData    = useRef(makeFetchData()).current;

  useEffect(() => {
    if (!containerRef.current || !code) return;

    window.React = React;
    window.Chart = Chart;

    // Always create a fresh child node so createRoot is never called twice
    // on the same element (avoids the Strict Mode double-invoke error).
    const node = document.createElement('div');
    node.style.cssText = 'height:100%;overflow:hidden';
    containerRef.current.appendChild(node);

    const root = createRoot(node);

    // Defer cleanup of the previous mount (must not unmount synchronously in React 19)
    const prev = mountRef.current;
    mountRef.current = { root, node };

    if (prev) {
      setTimeout(() => { prev.root.unmount(); prev.node.remove(); }, 0);
    }

    try {
      // eslint-disable-next-line no-new-func
      const ComponentFn = new Function(code + '\n; return App;')();
      root.render(React.createElement(ComponentFn, { fetchData, isEdit }));
    } catch (err) {
      console.error('[DynamicComponent] Failed to render component id=' + componentId, err);
      root.render(
        React.createElement('div', {
          style: { padding: 16, color: '#dc3545', fontSize: 12 }
        }, 'Failed to load component: ' + err.message)
      );
    }

    return () => {
      const m = mountRef.current;
      mountRef.current = null;
      if (m) {
        setTimeout(() => { m.root.unmount(); m.node.remove(); }, 0);
      }
    };
  }, [code, isEdit]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', overflow: 'hidden' }}
    />
  );
}

/* ── Main DynamicDashboard ─────────────────────────────────────────────── */
export default function DynamicDashboard({ siteId }) {
  const [components, setComponents] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isEdit,     setIsEdit]     = useState(false);
  const [layouts,    setLayouts]    = useState({});

  const layoutKey = `wp-dashboard-layout-v2-${siteId}`;

  /* Load components from backend */
  useEffect(() => {
    ismApi.get('my/dashboardmodules')
      .then(res => {
        const modules = res.data?.data?.modules || {};
        const wpModule = Object.values(modules).find(m => m.name === 'Work Permit');
        const allComps = wpModule?.module_components ?? [];
        const runnable = allComps.filter(c => c.active == 1 && c.chart_type === 'ang-react' && c.html);
        setComponents(runnable);

        // Load saved layout from localStorage
        try {
          const saved = localStorage.getItem(layoutKey);
          if (saved) {
            setLayouts(JSON.parse(saved));
          } else {
            setLayouts(defaultLayouts(runnable));
          }
        } catch {
          setLayouts(defaultLayouts(runnable));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem(layoutKey, JSON.stringify(allLayouts));
    } catch { /* ignore storage errors */ }
  }, [layoutKey]);

  const resetLayout = useCallback(() => {
    const fresh = defaultLayouts(components);
    setLayouts(fresh);
    try { localStorage.setItem(layoutKey, JSON.stringify(fresh)); } catch { /**/ }
  }, [components, layoutKey]);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ background: '#f8f9fa', borderRadius: 10, height: i === 0 ? 80 : 280, animationDelay: `${i * 0.1}s` }}
            className="dash-stat-skeleton" />
        ))}
      </div>
    );
  }

  if (!components.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#adb5bd' }}>
        <i className="fa fa-tachometer" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
        <div style={{ fontSize: 14 }}>No dashboard components configured</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Add components in the admin panel under Dashboard settings</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }} className="wp-dashboard-wrapper">

      {/* ── Edit mode hint ────────────────────────────────────────────── */}
      {isEdit && (
        <div style={{
          background: 'rgba(23,162,184,0.08)', border: '1px solid rgba(23,162,184,0.3)',
          borderRadius: 8, padding: '6px 12px', marginBottom: 8, fontSize: 11, color: '#0c7b8f',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="fa fa-info-circle" />
          Drag cards to rearrange. Drag the bottom-right corner to resize. Click <strong>Done</strong> to save.
        </div>
      )}

      {/* ── Hover toolbar (top-right, absolutely positioned) ──────────── */}
      {/* Edit toolbar temporarily hidden — re-enable by removing the false && */}
      {false && <div className="wp-dash-toolbar" style={{
        position: 'absolute', top: isEdit ? 44 : 8, right: 8, zIndex: 10,
        display: 'flex', gap: 6, alignItems: 'center',
        opacity: 0, transition: 'opacity 0.15s',
      }}>
        {isEdit && (
          <button
            onClick={resetLayout}
            style={{
              background: '#f8f9fa', color: '#6c757d', border: '1px solid #dee2e6',
              borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <i className="fa fa-undo me-1" />Reset
          </button>
        )}
        <button
          onClick={() => setIsEdit(e => !e)}
          style={{
            background: isEdit ? '#17a2b8' : '#fff',
            color: isEdit ? '#fff' : '#6c757d',
            border: isEdit ? '1px solid #17a2b8' : '1px solid #dee2e6',
            borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <i className={`fa ${isEdit ? 'fa-check' : 'fa-pencil'} me-1`} />
          {isEdit ? 'Done' : 'Edit'}
        </button>
      </div>}

      {/* ── Grid ──────────────────────────────────────────────────────── */}
      <ResponsiveGridLayout
        className="wp-dashboard-grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={BREAKPOINT_COLS}
        rowHeight={50}
        margin={[12, 12]}
        isDraggable={isEdit}
        isResizable={isEdit}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".grid-drag-handle"
      >
        {components.map(comp => (
          <div
            key={String(comp.id)}
            style={{
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: isEdit ? '2px dashed #17a2b8' : '1px solid #f0f0f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drag handle (only visible in edit mode) */}
            {isEdit && (
              <div
                className="grid-drag-handle"
                style={{
                  padding: '4px 10px',
                  background: 'rgba(23,162,184,0.08)',
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#0c7b8f',
                  borderBottom: '1px solid rgba(23,162,184,0.2)',
                  flexShrink: 0,
                }}
              >
                <i className="fa fa-arrows" style={{ fontSize: 12 }} />
                <span>{comp.name}</span>
              </div>
            )}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <DynamicComponent
                key={comp.id}
                componentId={comp.id}
                code={comp.html}
                isEdit={isEdit}
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
