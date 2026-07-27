import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workPermitService from '@/services/workPermitService';
import { useApp } from '@/context/AppContext';
import { openProgressReport } from '@/utils/progressReport';
import SearchableSelect from '@/components/common/SearchableSelect';
import { getStatusColor, getStatusStyle } from '@/utils/statusStyle';

const FALLBACK_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'DECLINED', 'REQUEST_CHANGE', 'COMPLETED'];

function formatStatusLabel(s) {
  return s.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

const TYPE_COLOR = '#7C3AED';
const DATE_COLOR = '#17A2B8';

function fmt(d) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function toYMD(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function getRouteQuery() {
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  return new URLSearchParams(hashQuery || window.location.search);
}

function CalendarMonth({ year, month, from, to, onDay, onHover }) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ width: 220 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#adb5bd', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ymd = toYMD(year, month, d);
          const isFrom    = ymd === from;
          const isTo      = ymd === to;
          const isEndpoint = isFrom || isTo;
          const rangeEnd  = to;
          const inRange   = from && rangeEnd && ymd > Math.min(from, rangeEnd) && ymd < Math.max(from, rangeEnd);
          const isToday   = ymd === new Date().toISOString().slice(0,10);

          return (
            <div
              key={d}
              onClick={() => onDay(ymd)}
              onMouseEnter={() => onHover(ymd)}
              onMouseLeave={() => onHover(null)}
              style={{
                textAlign: 'center', fontSize: 12, cursor: 'pointer',
                padding: '5px 0',
                background: isEndpoint ? DATE_COLOR : inRange ? `${DATE_COLOR}22` : 'transparent',
                color: isEndpoint ? '#fff' : isToday ? DATE_COLOR : '#212529',
                fontWeight: isEndpoint || isToday ? 700 : 400,
                outline: isToday && !isEndpoint ? `1.5px solid ${DATE_COLOR}66` : 'none',
                borderRadius: isFrom && to && from < to ? '8px 0 0 8px'
                  : isTo && from && from < to ? '0 8px 8px 0'
                  : isEndpoint ? 8 : inRange ? 0 : 8,
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({ from, to, onFrom, onTo }) {
  const today   = new Date();
  const [open,  setOpen]  = useState(false);
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [active, setActive] = useState('from');
  const ref = useRef(null);

  const hasDate = from || to;
  const label   = from && to ? `${fmt(from)} – ${fmt(to)}`
                : from       ? `From ${fmt(from)}`
                : to         ? `Until ${fmt(to)}`
                :              'Date Range';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => { if (viewM === 0) { setViewM(11); setViewY(y => y - 1); } else setViewM(m => m - 1); };
  const nextMonth = () => { if (viewM === 11) { setViewM(0);  setViewY(y => y + 1); } else setViewM(m => m + 1); };

  const handleDay = (ymd) => {
    if (active === 'from') {
      onFrom(ymd);
      if (to && ymd > to) onTo('');
      setActive('to');
    } else {
      if (ymd < from) { onFrom(ymd); onTo(from); }
      else onTo(ymd);
      setActive('from');
    }
  };

  const clearAll = (e) => { e?.stopPropagation(); onFrom(''); onTo(''); setActive('from'); };

  const fieldStyle = (field) => ({
    flex: 1, padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
    border: `1.5px solid ${active === field ? DATE_COLOR : '#e9ecef'}`,
    background: active === field ? `${DATE_COLOR}08` : '#f8f9fa',
    transition: 'all 0.15s',
  });

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: hasDate ? '#F3F4F6' : '#fff',
          color: hasDate ? '#111827' : '#374151',
          border: `1px solid ${hasDate ? '#9CA3AF' : '#D1D5DB'}`,
          borderRadius: 20, padding: '3px 10px', fontSize: 11.5,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          gap: 5, fontWeight: 600, whiteSpace: 'nowrap',
          transition: 'all 0.15s', height: 34,
        }}
      >
        <i className="fa fa-calendar" style={{ fontSize: 10, color: '#6B7280' }} />
        {label}
        {hasDate
          ? <span onClick={clearAll} style={{ marginLeft: 4, opacity: 0.8, lineHeight: 1 }}>×</span>
          : <i className={`fa fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, marginLeft: 2, color: '#6B7280' }} />
        }
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#fff', border: '1.5px solid #e9ecef', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.13)', padding: 16, minWidth: 260,
          userSelect: 'none',
        }}>
          <div className="d-flex gap-2 mb-3">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: active === 'from' ? DATE_COLOR : '#adb5bd', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From</div>
              <div onClick={() => setActive('from')} style={fieldStyle('from')}>
                <span style={{ fontSize: 12, color: from ? '#212529' : '#adb5bd', fontWeight: from ? 600 : 400 }}>
                  {from ? fmt(from) : 'Start date'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: active === 'to' ? DATE_COLOR : '#adb5bd', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To</div>
              <div onClick={() => setActive('to')} style={fieldStyle('to')}>
                <span style={{ fontSize: 12, color: to ? '#212529' : '#adb5bd', fontWeight: to ? 600 : 400 }}>
                  {to ? fmt(to) : 'End date'}
                </span>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <button onClick={prevMonth} style={{ background: 'none', border: '1.5px solid #e9ecef', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
              <i className="fa fa-chevron-left" style={{ fontSize: 9 }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#212529' }}>
              {MONTHS[viewM]} {viewY}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: '1.5px solid #e9ecef', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
              <i className="fa fa-chevron-right" style={{ fontSize: 9 }} />
            </button>
          </div>

          <CalendarMonth year={viewY} month={viewM} from={from} to={to} onDay={handleDay} onHover={() => {}} />

          {hasDate && (
            <div style={{ marginTop: 10, borderTop: '1px solid #f1f3f5', paddingTop: 8, textAlign: 'right' }}>
              <button onClick={() => { clearAll(); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#adb5bd', cursor: 'pointer', padding: 0 }}>
                Clear dates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypePillSelect({ value, onChange, types }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref      = useRef(null);
  const inputRef = useRef(null);
  const selected = types.find(t => t.value === value);
  const filtered = types.filter(t => t.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={handleOpen}
        style={{
          background: value ? '#F3F4F6' : '#fff',
          color: value ? '#111827' : '#374151',
          border: `1px solid ${value ? '#9CA3AF' : '#D1D5DB'}`,
          borderRadius: 20, padding: '3px 10px', fontSize: 11.5,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          gap: 5, fontWeight: 600, whiteSpace: 'nowrap',
          transition: 'all 0.15s', height: 34,
        }}
      >
        <i className="fa fa-tag" style={{ fontSize: 10, color: '#6B7280' }} />
        {selected ? selected.label : 'All Types'}
        <i className={`fa fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, marginLeft: 2, color: '#6B7280' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#fff', border: '1.5px solid #dee2e6', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '6px 4px',
          minWidth: 230,
        }}>
          <div style={{ position: 'relative', padding: '0 4px 4px' }}>
            <i className="fa fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-60%)', color: '#adb5bd', fontSize: 11, pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search types..."
              style={{
                width: '100%', padding: '5px 8px 5px 26px', fontSize: 12,
                border: '1.5px solid #e9ecef', borderRadius: 7, outline: 'none',
                background: '#f8f9fa', color: '#495057',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {!search && (
              <button
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: !value ? `${TYPE_COLOR}15` : 'transparent',
                  color: !value ? TYPE_COLOR : '#495057',
                  border: 'none', borderRadius: 6, padding: '5px 10px',
                  fontSize: 12, fontWeight: !value ? 700 : 400, cursor: 'pointer',
                }}
              >
                All Types
              </button>
            )}
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: 12, color: '#adb5bd', textAlign: 'center' }}>No results</div>
            ) : filtered.map(t => (
              <button
                key={t.value}
                onClick={() => { onChange(t.value); setOpen(false); setSearch(''); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: value === t.value ? `${TYPE_COLOR}15` : 'transparent',
                  color: value === t.value ? TYPE_COLOR : '#495057',
                  border: 'none', borderRadius: 6, padding: '5px 10px',
                  fontSize: 12, fontWeight: value === t.value ? 700 : 400, cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PRIORITIES_LIST = ['Urgent', 'High', 'Normal', 'Low'];
const PRIORITY_COLOR = '#F59E0B';

function PrioritySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = PRIORITIES_LIST.find(p => p.toUpperCase() === value?.toUpperCase());

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: value ? '#F3F4F6' : '#fff',
          color: value ? '#111827' : '#374151',
          border: `1px solid ${value ? '#9CA3AF' : '#D1D5DB'}`,
          borderRadius: 20, padding: '3px 10px', fontSize: 11.5,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          gap: 5, fontWeight: 600, whiteSpace: 'nowrap',
          transition: 'all 0.15s', height: 34,
        }}
      >
        <i className="fa fa-flag" style={{ fontSize: 10, color: '#6B7280' }} />
        {selected || 'All priorities'}
        <i className={`fa fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, marginLeft: 2, color: '#6B7280' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#fff', border: '1.5px solid #dee2e6', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '6px 4px',
          minWidth: 160,
        }}>
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: !value ? `${PRIORITY_COLOR}15` : 'transparent', color: !value ? PRIORITY_COLOR : '#495057', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: !value ? 700 : 400, cursor: 'pointer' }}
          >All priorities</button>
          {PRIORITIES_LIST.map(p => (
            <button
              key={p}
              onClick={() => { onChange(p.toUpperCase()); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: value?.toUpperCase() === p.toUpperCase() ? `${PRIORITY_COLOR}15` : 'transparent', color: value?.toUpperCase() === p.toUpperCase() ? PRIORITY_COLOR : '#495057', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: value?.toUpperCase() === p.toUpperCase() ? 700 : 400, cursor: 'pointer' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkPermitList() {
  const { siteId }                  = useParams();
  const navigate                    = useNavigate();
  const { permitTypes, statuses }   = useApp();

  const statusPills = (statuses.length ? statuses : FALLBACK_STATUSES).map(s => ({
    value: s,
    label: formatStatusLabel(s),
    color: getStatusColor(s),
  }));

  const typeLabel = (val) => permitTypes.find(t => t.value === val)?.label || val || '—';

  const scheduledAt = (permit) => {
    const scheduledDate = permit['Scheduled Date'] || permit.start_date;
    if (!scheduledDate) return '—';

    const dateText = String(scheduledDate);
    if (/\d{1,2}:\d{2}/.test(dateText) || !permit.start_time) return dateText;

    return `${dateText} ${permit.start_time}`;
  };

  const [permits,    setPermits]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState(() => {
    const query = getRouteQuery();
    const suppliedDates = query.has('date_from') || query.has('date_to');
    const dates = suppliedDates
      ? { date_from: query.get('date_from') || '', date_to: query.get('date_to') || '' }
      : { date_from: '', date_to: '' };
    return {
      status: query.get('status') || '',
      type: query.get('type') || '',
      priority: '',
      ...dates,
      search: query.get('search') || '',
      per_page: 20,
      page_no: 1,
    };
  });
  const [meta,       setMeta]       = useState({ total: 0, last_page: 1 });
  const [hasMore,    setHasMore]    = useState(true);
  const [searchText, setSearchText] = useState(() => getRouteQuery().get('search') || '');
  const [categories, setCategories] = useState([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({ category_uuid: '', type: '', date_from: '', date_to: '' });
  const debounceRef = useRef(null);

  useEffect(() => {
    workPermitService.getCategories(siteId).then(r => setCategories(r.data?.data || [])).catch(() => {});
  }, [siteId]);

  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const load = useCallback((f, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    const params = { per_page: f.per_page, page_no: f.page_no };
    if (f.status)     params.status     = f.status;
    if (f.type)       params.type       = f.type;
    if (f.priority)   params.priority   = f.priority;
    if (f.is_overdue) params.is_overdue = true;
    if (f.date_from)  params.date_from  = f.date_from;
    if (f.date_to)    params.date_to    = f.date_to;
    if (f.search)     params.search     = f.search;

    workPermitService.getAll(params)
      .then(res => {
        const data = res.data?.data || [];
        setPermits(prev => append ? [...prev, ...data] : data);
        setMeta(res.data?.metadata    || { total: 0, last_page: 1 });
        setHasMore(data.length === f.per_page);
      })
      .catch(() => {})
      .finally(() => { if (append) setLoadingMore(false); else setLoading(false); });
  }, []);

  useEffect(() => { load(filters); }, [siteId]);

  const handleFilter = (key, val) => {
    const next = { ...filters, [key]: val, page_no: 1 };
    setFilters(next);
    load(next);
  };

  const handleSearch = (val) => {
    setSearchText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = { ...filters, search: val, page_no: 1 };
      setFilters(next);
      load(next);
    }, 400);
  };

  const clearFilters = () => {
    setSearchText('');
    const next = { ...filters, status: '', type: '', priority: '', is_overdue: false, date_from: '', date_to: '', search: '', page_no: 1 };
    setFilters(next);
    load(next);
  };

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const next = { ...filters, page_no: filters.page_no + 1 };
    setFilters(next);
    load(next, true);
  }, [filters, loading, loadingMore, hasMore, load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleExport = () => {
    setExportForm({ category_uuid: '', type: filters.type || '', date_from: filters.date_from, date_to: filters.date_to });
    setShowExportDialog(true);
  };

  const handleConfirmExport = () => {
    const params = {};
    if (exportForm.category_uuid) params.category_uuid = exportForm.category_uuid;
    if (exportForm.type)          params.type           = exportForm.type;
    if (exportForm.date_from)     params.date_from      = exportForm.date_from;
    if (exportForm.date_to)       params.date_to        = exportForm.date_to;

    setShowExportDialog(false);

    const categoryLabel = categories.find(c => c.uuid === exportForm.category_uuid)?.Name;

    openProgressReport({
      title: 'Preparing Work Permit report',
      subtitle: 'Please keep this window open while we gather the work permits.',
      details: [
        { label: 'Category', value: categoryLabel || 'All' },
        { label: 'Type', value: typeLabel(exportForm.type) || 'All' },
        { label: 'From', value: exportForm.date_from || '-' },
        { label: 'To', value: exportForm.date_to || '-' },
      ],
      requestFn: (progressId) => workPermitService.exportReport(params, progressId),
    });
  };

  const displayedPermits = permits.filter(permit => {
    if (filters.priority && (permit.priority || '').toUpperCase() !== filters.priority.toUpperCase()) {
      return false;
    }
    if (filters.is_overdue) {
      const dueStr = permit['Due Date'] || permit.due_date;
      if (!dueStr) return false;
      const dueDate = new Date(dueStr);
      const isOverdue = !isNaN(dueDate) && dueDate < new Date() && !['COMPLETED','DECLINED','CANCELLED'].includes(permit.status);
      if (!isOverdue) return false;
    }
    return true;
  });

  const hasFilter = filters.status || filters.type || filters.priority || filters.is_overdue || filters.date_from || filters.date_to || filters.search;

  return (
    <div className="wp-page" style={{ padding: '16px' }}>
      {/* ── Top Header & Filter Card Container ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #D1D5DB',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}>
        {/* ── Row 1: Search, Dropdowns, Divider, Chips & Action Buttons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 auto' }}>
            <input
              type="text"
              style={{
                width: '100%', padding: '6px 12px', paddingRight: searchText ? 28 : 12,
                fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 6,
                height: 36, outline: 'none', color: '#374151', background: '#fff',
              }}
              placeholder="Search by permit number, title, or vendor"
              value={searchText}
              onChange={e => handleSearch(e.target.value)}
            />
            {searchText && (
              <button onClick={() => handleSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 2, fontSize: 13 }}>
                <i className="fa fa-times-circle" />
              </button>
            )}
          </div>

          {/* Dropdown 1: All types */}
          <TypePillSelect
            value={filters.type}
            onChange={val => handleFilter('type', val)}
            types={permitTypes}
          />

          {/* Dropdown 2: All priorities */}
          <PrioritySelect
            value={filters.priority || ''}
            onChange={val => handleFilter('priority', val)}
          />

          {/* Dropdown 3: Date range */}
          <DateRangePicker
            from={filters.date_from}
            to={filters.date_to}
            onFrom={val => handleFilter('date_from', val)}
            onTo={val => handleFilter('date_to', val)}
          />

          {/* Vertical divider line */}
          <div style={{ height: 20, width: 1, background: '#E5E7EB', margin: '0 2px' }} />

          {/* Summary Chips */}
          {(() => {
            const urgentCount = meta.urgent_count ?? permits.filter(p => (p.priority || '').toUpperCase() === 'URGENT').length;
            const overdueCount = meta.overdue_count ?? permits.filter(p => {
              const dueStr = p['Due Date'] || p.due_date;
              if (!dueStr) return false;
              const dueDate = new Date(dueStr);
              return !isNaN(dueDate) && dueDate < new Date() && !['COMPLETED','DECLINED','CANCELLED'].includes(p.status);
            }).length;

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  onClick={() => {
                    const next = { ...filters, status: '', priority: '', is_overdue: false, page_no: 1 };
                    setFilters(next);
                    load(next);
                  }}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: (!filters.status && !filters.priority && !filters.is_overdue) ? '#111827' : '#4B5563',
                    background: (!filters.status && !filters.priority && !filters.is_overdue) ? '#E5E7EB' : '#F3F4F6',
                    border: (!filters.status && !filters.priority && !filters.is_overdue) ? '1.5px solid #6B7280' : '1px solid #E5E7EB',
                    borderRadius: 20, padding: '3px 12px', whiteSpace: 'nowrap', cursor: 'pointer',
                    userSelect: 'none', transition: 'all 0.15s ease',
                  }}
                  title="Show all open permits"
                >
                  {meta.total || permits.length} open
                </span>

                <span
                  onClick={() => urgentCount > 0 && handleFilter('priority', filters.priority === 'URGENT' ? '' : 'URGENT')}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: filters.priority === 'URGENT' ? '#991B1B' : urgentCount > 0 ? '#4B5563' : '#9CA3AF',
                    background: filters.priority === 'URGENT' ? '#FEE2E2' : '#F3F4F6',
                    border: filters.priority === 'URGENT' ? '1.5px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: 20, padding: '3px 12px', whiteSpace: 'nowrap', cursor: urgentCount > 0 ? 'pointer' : 'default',
                    userSelect: 'none', transition: 'all 0.15s ease',
                  }}
                  title={urgentCount > 0 ? "Filter by Urgent priority" : "No urgent permits"}
                >
                  {urgentCount} urgent
                </span>

                <span
                  onClick={() => overdueCount > 0 && (() => {
                    const next = { ...filters, is_overdue: !filters.is_overdue, page_no: 1 };
                    setFilters(next);
                    load(next);
                  })()}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: filters.is_overdue ? '#92400E' : overdueCount > 0 ? '#4B5563' : '#9CA3AF',
                    background: filters.is_overdue ? '#FEF3C7' : '#F3F4F6',
                    border: filters.is_overdue ? '1.5px solid #F59E0B' : '1px solid #E5E7EB',
                    borderRadius: 20, padding: '3px 12px', whiteSpace: 'nowrap', cursor: overdueCount > 0 ? 'pointer' : 'default',
                    userSelect: 'none', transition: 'all 0.15s ease',
                  }}
                  title={overdueCount > 0 ? "Filter by Overdue permits" : "No overdue permits"}
                >
                  {overdueCount} overdue
                </span>
              </div>
            );
          })()}

          {/* Action Buttons flush to right */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 18px', fontSize: 13, fontWeight: 600,
                border: '1px solid #0066CC', borderRadius: 6, background: '#fff', color: '#0066CC', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              onClick={handleExport}
            >
              Export
            </button>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 18px', fontSize: 13, fontWeight: 600,
                border: 'none', borderRadius: 6, background: '#0066CC', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              onClick={() => navigate(`/site/${siteId}/work-permit/new`)}
            >
              Raise work permit
            </button>
          </div>
        </div>

        {/* ── Row 2: Status Pills (Non-zero count filled pills first, 0 value pills after) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[...statusPills]
              .sort((a, b) => {
                const countA = permits.filter(p => p.status === a.value).length;
                const countB = permits.filter(p => p.status === b.value).length;
                if (countA > 0 && countB === 0) return -1;
                if (countA === 0 && countB > 0) return 1;
                return 0;
              })
              .map(pill => {
                const isActive = filters.status === pill.value;
                const count = permits.filter(p => p.status === pill.value).length;
                return (
                  <button
                    key={pill.value}
                    onClick={() => handleFilter('status', isActive ? '' : pill.value)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 14px', fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      borderRadius: 20,
                      border: isActive ? 'none' : '1px solid #E5E7EB',
                      background: isActive ? '#0066CC' : '#ffffff',
                      color: isActive ? '#ffffff' : count > 0 ? '#374151' : '#9CA3AF',
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{pill.label}</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : '#9CA3AF',
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>

          {hasFilter && (
            <button
              onClick={clearFilters}
              style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>PERMIT NO</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>TYPE</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>LOCATION</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>ASSET</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>VENDOR</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>SCHEDULED</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>DUE</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>PRIORITY</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}>STATUS</th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0066CC', whiteSpace: 'nowrap' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                  <div className="wp-empty-state">
                    <i className="fa fa-circle-o-notch fa-spin" />
                    <div className="wp-state-title">Loading work permits…</div>
                  </div>
                </td>
              </tr>
            ) : displayedPermits.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                  <div className="wp-empty-state">
                    <i className="fa fa-file-text-o" />
                    <div className="wp-state-title">No work permits found</div>
                    <div className="wp-state-sub">
                      {hasFilter ? 'Try adjusting or clearing your filters.' : 'Raise a work permit to get started.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              displayedPermits.map((permit, idx) => {
                const isOverdue = permit['Due Date'] && (() => {
                  const dueStr = permit['Due Date'];
                  const dueParts = dueStr.match(/(\d+)\s+(\w+),\s+(\d+)/);
                  if (!dueParts) return false;
                  const now = new Date();
                  const dueDate = new Date(dueStr);
                  return !isNaN(dueDate) && dueDate < now && !['COMPLETED','DECLINED','CANCELLED'].includes(permit.status);
                })();

                const priorityDotColor = {
                  'URGENT': '#EF4444',
                  'HIGH': '#F97316',
                  'NORMAL': '#10B981',
                  'LOW': '#6B7280',
                }[permit.priority?.toUpperCase()] || '#6B7280';

                const statusStyle = (() => {
                  const s = (permit.status || 'DRAFT').toUpperCase();
                  if (s === 'PENDING') return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
                  if (s === 'APPROVED') return { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' };
                  if (s === 'ACTIVE') return { background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' };
                  if (s === 'DECLINED') return { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' };
                  if (s === 'COMPLETED') return { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' };
                  if (s === 'REQUEST_CHANGE') return { background: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' };
                  if (s === 'DRAFT') return { background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' };
                  return { background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' };
                })();

                return (
                  <tr
                    key={permit.uuid || permit._ID}
                    style={{
                      cursor: 'pointer',
                      borderBottom: idx < permits.length - 1 ? '1px solid #F3F4F6' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => navigate(`/site/${siteId}/work-permit/${permit["Sequence No"]}`)}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#17A2B8', fontSize: 13.5, whiteSpace: 'nowrap' }}>
                      {permit["Sequence No"] || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#374151' }}>
                      {typeLabel(permit.type)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#374151', whiteSpace: 'nowrap' }}>
                      {permit.location_name || permit.location || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#374151', whiteSpace: 'nowrap' }}>
                      {permit.asset_name || permit.asset_seq || permit.asset || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#374151' }}>
                      {permit.vendor_name || permit.vendor_contact_name || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13.5, color: '#374151', whiteSpace: 'nowrap' }}>
                      {scheduledAt(permit)}
                    </td>
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#DC2626' : '#374151' }}>
                        {permit['Due Date'] || '—'}
                      </span>
                      {isOverdue && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>
                          Overdue
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: priorityDotColor }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: priorityDotColor, flexShrink: 0, display: 'inline-block' }} />
                        {permit.priority
                          ? permit.priority.charAt(0).toUpperCase() + permit.priority.slice(1).toLowerCase()
                          : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        whiteSpace: 'nowrap', ...statusStyle
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                        {(permit.status || 'DRAFT').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Loading more inside table card */}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#9CA3AF', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
            <i className="fa fa-circle-o-notch fa-spin" style={{ color: '#17A2B8' }} />
            Loading more permits...
          </div>
        )}
      </div>

      {/* Infinite scroll trigger */}
      {!loading && hasMore && !loadingMore && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
      {!loading && !hasMore && permits.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#9CA3AF', fontSize: 12 }}>All work permits loaded</div>
      )}

      {showExportDialog && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">Export Work Permits</h5>
                <button className="btn-close" onClick={() => setShowExportDialog(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Asset Category</label>
                  <SearchableSelect
                    options={categories.map(c => ({ value: c.uuid, label: c.Name }))}
                    value={exportForm.category_uuid}
                    onChange={val => setExportForm(prev => ({ ...prev, category_uuid: val }))}
                    placeholder="All categories"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Permit Type</label>
                  <SearchableSelect
                    options={permitTypes}
                    value={exportForm.type}
                    onChange={val => setExportForm(prev => ({ ...prev, type: val }))}
                    placeholder="All types"
                  />
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label fw-semibold small">From</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={exportForm.date_from || ''}
                      onChange={e => setExportForm(prev => ({ ...prev, date_from: e.target.value }))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold small">To</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={exportForm.date_to || ''}
                      onChange={e => setExportForm(prev => ({ ...prev, date_to: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowExportDialog(false)}>Cancel</button>
                <button className="btn btn-primary-dark btn-sm" onClick={handleConfirmExport}>
                  <i className="fa fa-download me-1" />Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
