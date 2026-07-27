import { useState, useRef, useEffect } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function parse(val) {
  if (!val) return { hour: '09', minute: '00', period: 'AM' };
  const [h, m] = val.split(':').map(Number);
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

  const handleOptionClick = (h, m, p) => {
    setSelHour(h);
    setSelMinute(m);
    setSelPeriod(p);
    if (!isBelowMin(h, m, p)) {
      onChange(toHHMM(h, m, p));
    }
  };

  const displayString = value ? `${selHour}:${selMinute} ${selPeriod}` : '';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input container matching screenshot */}
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
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ fontSize: 13, color: displayString ? '#111827' : '#9CA3AF', fontWeight: displayString ? 500 : 400 }}>
          {displayString || placeholder}
        </span>
        <i className="fa fa-clock-o" style={{ fontSize: 14, color: '#9CA3AF' }} />
      </div>

      {/* Clean 3-Column Popover: HR | MIN | AM/PM */}
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
            width: 230,
            padding: 12,
            userSelect: 'none',
          }}
        >
          {/* Column Header Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6, textAlign: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>HR</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>MIN</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>AM/PM</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, alignItems: 'start' }}>
            {/* Hour Column */}
            <div style={{ maxHeight: 160, overflowY: 'auto', paddingRight: 2 }}>
              {HOURS.map(h => {
                const dis = isBelowMin(h, selMinute, selPeriod);
                const isSelected = selHour === h;
                return (
                  <div
                    key={h}
                    onClick={() => !dis && handleOptionClick(h, selMinute, selPeriod)}
                    style={{
                      padding: '5px 0',
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 400,
                      borderRadius: 6,
                      cursor: dis ? 'not-allowed' : 'pointer',
                      background: isSelected ? '#EFF6FF' : 'transparent',
                      color: dis ? '#D1D5DB' : isSelected ? '#2563EB' : '#374151',
                      marginBottom: 2,
                      transition: 'background 0.1s ease',
                    }}
                  >
                    {h}
                  </div>
                );
              })}
            </div>

            {/* Minute Column */}
            <div style={{ maxHeight: 160, overflowY: 'auto', paddingRight: 2 }}>
              {MINUTES.map(m => {
                const dis = isBelowMin(selHour, m, selPeriod);
                const isSelected = selMinute === m;
                return (
                  <div
                    key={m}
                    onClick={() => !dis && handleOptionClick(selHour, m, selPeriod)}
                    style={{
                      padding: '5px 0',
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 400,
                      borderRadius: 6,
                      cursor: dis ? 'not-allowed' : 'pointer',
                      background: isSelected ? '#EFF6FF' : 'transparent',
                      color: dis ? '#D1D5DB' : isSelected ? '#2563EB' : '#374151',
                      marginBottom: 2,
                      transition: 'background 0.1s ease',
                    }}
                  >
                    {m}
                  </div>
                );
              })}
            </div>

            {/* AM / PM Segment Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['AM', 'PM'].map(p => {
                const isSelected = selPeriod === p;
                const dis = isBelowMin(selHour, selMinute, p);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={dis}
                    onClick={() => !dis && handleOptionClick(selHour, selMinute, p)}
                    style={{
                      padding: '6px 0',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: dis ? 'not-allowed' : 'pointer',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #D1D5DB',
                      background: isSelected ? '#2563EB' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#374151',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDone}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '6px',
              borderRadius: 8,
              border: 'none',
              background: '#2563EB',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
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
