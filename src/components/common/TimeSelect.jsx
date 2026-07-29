import { useState, useRef, useEffect } from 'react';

function parse(val) {
  if (!val) return { hour: '09', minute: '00', period: 'AM' };
  const parts = val.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return {
    hour: String(h === 0 ? 12 : h > 12 ? h - 12 : h).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
    period: h >= 12 ? 'PM' : 'AM',
  };
}

function toHHMM(hour, minute, period) {
  let h = parseInt(hour, 10);
  if (period === 'AM') h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default function TimeSelect({
  value,
  onChange,
  placeholder = '--:--',
  disabled = false,
  required = false,
  minTime = null,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parsed = parse(value);
  const [selHour, setSelHour] = useState(parsed.hour);
  const [selMinute, setSelMinute] = useState(parsed.minute);
  const [selPeriod, setSelPeriod] = useState(parsed.period);

  useEffect(() => {
    const p = parse(value);
    setSelHour(p.hour);
    setSelMinute(p.minute);
    setSelPeriod(p.period);
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const minMinutes = minTime ? toMinutes(minTime) : null;
  const isBelowMin = (h, m, p) => minMinutes !== null && toMinutes(toHHMM(h, m, p)) < minMinutes;

  const handleDone = () => {
    if (isBelowMin(selHour, selMinute, selPeriod)) return;
    onChange(toHHMM(selHour, selMinute, selPeriod));
    setOpen(false);
  };

  const adjust = (type, dir) => {
    if (type === 'hour') {
      let h = parseInt(selHour, 10);
      h = dir === 1 ? h + 1 : h - 1;
      if (h > 12) h = 1;
      if (h < 1) h = 12;
      setSelHour(String(h).padStart(2, '0'));
    } else if (type === 'minute') {
      let m = parseInt(selMinute, 10);
      m = dir === 1 ? m + 1 : m - 1;
      if (m > 59) m = 0;
      if (m < 0) m = 59;
      setSelMinute(String(m).padStart(2, '0'));
    }
  };

  let displayString = '';
  if (value) {
    const p = parse(value);
    displayString = `${parseInt(p.hour, 10)} : ${p.minute} ${p.period}`;
  }

  const arrowBtnStyle = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    color: '#6B7280',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="form-control form-control-sm d-flex align-items-center justify-content-between"
        style={{
          height: 38,
          borderRadius: 8,
          borderColor: open ? '#2563EB' : '#D1D5DB',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#F3F4F6' : '#FFFFFF',
          padding: '6px 12px',
          transition: 'all 0.15s ease',
        }}
        onClick={() => {
          if (!disabled) {
            const p = parse(value);
            setSelHour(p.hour);
            setSelMinute(p.minute);
            setSelPeriod(p.period);
            setOpen(o => !o);
          }
        }}
      >
        <span style={{ fontSize: 13, color: displayString ? '#111827' : '#9CA3AF', fontWeight: displayString ? 500 : 400 }}>
          {displayString || placeholder}
        </span>
        <i className="fa fa-clock-o" style={{ fontSize: 14, color: '#9CA3AF' }} />
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1050,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
            width: 280,
            padding: '16px',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            {/* Hour and Minute Controls */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => adjust('hour', 1)} style={arrowBtnStyle}><i className="fa fa-chevron-up" style={{ fontSize: 9 }} /></button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{parseInt(selHour, 10)}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>hour</div>
                </div>
                <button type="button" onClick={() => adjust('hour', -1)} style={arrowBtnStyle}><i className="fa fa-chevron-down" style={{ fontSize: 9 }} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => adjust('minute', 1)} style={arrowBtnStyle}><i className="fa fa-chevron-up" style={{ fontSize: 9 }} /></button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{selMinute}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>min</div>
                </div>
                <button type="button" onClick={() => adjust('minute', -1)} style={arrowBtnStyle}><i className="fa fa-chevron-down" style={{ fontSize: 9 }} /></button>
              </div>
            </div>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: '80%', background: '#E5E7EB' }} />

            {/* AM/PM Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['AM', 'PM'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelPeriod(p)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    background: selPeriod === p ? '#2563EB' : '#F3F4F6',
                    color: selPeriod === p ? '#FFFFFF' : '#4B5563',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#4B5563' }}>
              {parseInt(selHour, 10)} : {selMinute} {selPeriod}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDone}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {required && (
        <input
          tabIndex={-1}
          value={value || ''}
          onChange={() => {}}
          required
          style={{ opacity: 0, position: 'absolute', bottom: 0, left: 0, width: '100%', height: 1, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}

