import { useState, useRef, useEffect } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function parse(val) {
  if (!val) return { hour: '12', minute: '00', period: 'AM' };
  const [h, m] = val.split(':').map(Number);
  return {
    hour: String(h === 0 ? 12 : h > 12 ? h - 12 : h),
    minute: String(m).padStart(2, '0'),
    period: h >= 12 ? 'PM' : 'AM',
  };
}

function toHHMM(hour, minute, period) {
  let h = parseInt(hour);
  if (period === 'AM') h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default function TimeSelect({ value, onChange, placeholder = 'Select time', disabled = false, required = false, minTime = null, allowedMinutes = null }) {
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
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const minMinutes = minTime ? toMinutes(minTime) : null;
  const permittedMinutes = Array.isArray(allowedMinutes)
    ? allowedMinutes.map(minute => String(minute).padStart(2, '0'))
    : null;

  const isBelowMin = (hour, minute, period) => minMinutes !== null && toMinutes(toHHMM(hour, minute, period)) < minMinutes;
  const isOptionDisabled = (hour, minute, period) =>
    (permittedMinutes !== null && !permittedMinutes.includes(String(minute).padStart(2, '0')))
    || isBelowMin(hour, minute, period);

  const periodDisabled = (period) => HOURS.every(h => MINUTES.every(m => isOptionDisabled(h, m, period)));
  const hourDisabled = (hour) => MINUTES.every(m => isOptionDisabled(hour, m, selPeriod));
  const minuteDisabled = (minute) => isOptionDisabled(selHour, minute, selPeriod);

  useEffect(() => {
    if (minMinutes === null) return;
    if (isOptionDisabled(selHour, selMinute, selPeriod)) {
      if (periodDisabled(selPeriod)) {
        const otherPeriod = selPeriod === 'AM' ? 'PM' : 'AM';
        if (!periodDisabled(otherPeriod)) setSelPeriod(otherPeriod);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTime, open]);

  const handleDone = () => {
    if (isOptionDisabled(selHour, selMinute, selPeriod)) return;
    onChange(toHHMM(selHour, selMinute, selPeriod));
    setOpen(false);
  };

  const displayValue = value ? `${selHour}:${selMinute} ${selPeriod}` : null;

  const itemStyle = (active, itemDisabled) => ({
    padding: '6px 0',
    textAlign: 'center',
    cursor: itemDisabled ? 'not-allowed' : 'pointer',
    borderRadius: 4,
    fontSize: 14,
    background: active ? '#e8f6f8' : 'transparent',
    color: itemDisabled ? '#ccc' : active ? '#17a2b8' : '#333',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="form-control form-control-sm d-flex align-items-center justify-content-between"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          color: displayValue ? '#333' : '#999',
          background: disabled ? '#e9ecef' : '#fff',
        }}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ fontSize: 14 }}>
          <i className="fa fa-clock-o me-2" style={{ fontSize: 12, color: '#aaa' }} />
          {displayValue || placeholder}
        </span>
        <i className={`fa fa-chevron-${open ? 'up' : 'down'} text-muted`} style={{ fontSize: 11 }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #dee2e6', borderRadius: 8,
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)', minWidth: 220, padding: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 4 }}>Hour</div>
              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                {HOURS.map(h => {
                  const dis = hourDisabled(h);
                  return (
                    <div key={h} style={itemStyle(selHour === h, dis)} onClick={() => !dis && setSelHour(h)}>{h}</div>
                  );
                })}
              </div>
            </div>

            <div style={{ paddingTop: 28, color: '#ccc', fontSize: 18, flexShrink: 0 }}>:</div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 4 }}>Min</div>
              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                {MINUTES.map(m => {
                  const dis = minuteDisabled(m);
                  return (
                    <div key={m} style={itemStyle(selMinute === m, dis)} onClick={() => !dis && setSelMinute(m)}>{m}</div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 24, flexShrink: 0 }}>
              {['AM', 'PM'].map(p => {
                const dis = periodDisabled(p);
                return (
                  <button key={p} type="button" disabled={dis} onClick={() => setSelPeriod(p)} style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: dis ? 'not-allowed' : 'pointer',
                    border: `2px solid ${selPeriod === p ? '#17a2b8' : '#dee2e6'}`,
                    background: dis ? '#f5f5f5' : selPeriod === p ? '#e8f6f8' : '#fff',
                    color: dis ? '#ccc' : selPeriod === p ? '#17a2b8' : '#666',
                  }}>{p}</button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={handleDone} disabled={isOptionDisabled(selHour, selMinute, selPeriod)} style={{
            marginTop: 10, width: '100%', padding: '7px', borderRadius: 6,
            border: 'none', background: isOptionDisabled(selHour, selMinute, selPeriod) ? '#a9dde3' : '#17a2b8', color: '#fff',
            fontWeight: 600, fontSize: 13, cursor: isOptionDisabled(selHour, selMinute, selPeriod) ? 'not-allowed' : 'pointer',
          }}>Done</button>
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
