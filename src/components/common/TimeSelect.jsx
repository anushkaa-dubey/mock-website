import { useState, useRef, useEffect, useMemo } from 'react';

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${String(displayHour).padStart(2, '0')}:${mm} ${period}`;

      slots.push({ value, label, minutes: h * 60 + m });
    }
  }
  return slots;
}

const ALL_SLOTS = generateTimeSlots();

function formatDisplayTime(value) {
  if (!value) return '';
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return value;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export default function TimeSelect({
  value,
  onChange,
  placeholder = 'Select start time',
  disabled = false,
  required = false,
  minTime = null,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const minMinutes = useMemo(() => {
    if (!minTime) return null;
    const [h, m] = minTime.split(':').map(Number);
    return h * 60 + m;
  }, [minTime]);

  const filteredSlots = useMemo(() => {
    let list = ALL_SLOTS;
    if (minMinutes !== null) {
      list = list.filter(s => s.minutes >= minMinutes);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/[\s:]/g, '');
      list = list.filter(s => {
        const valClean = s.value.replace(':', '');
        const lblClean = s.label.toLowerCase().replace(/[\s:]/g, '');
        return valClean.includes(q) || lblClean.includes(q);
      });
    }
    return list;
  }, [minMinutes, searchQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view when opening
  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [open]);

  const displayString = formatDisplayTime(value);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input container */}
      <div
        className="form-control d-flex align-items-center justify-content-between"
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

      {/* Standard UX Dropdown List */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
            maxHeight: 230,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Quick Search Header */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            <input
              type="text"
              placeholder="Search time (e.g. 09:30 or 2 PM)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                outline: 'none',
                color: '#374151',
              }}
            />
          </div>

          {/* Time Slot List */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {filteredSlots.length === 0 ? (
              <div style={{ padding: '12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                No available times
              </div>
            ) : (
              filteredSlots.map(slot => {
                const isSelected = value === slot.value;
                return (
                  <div
                    key={slot.value}
                    data-selected={isSelected}
                    onClick={() => handleSelect(slot.value)}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#2563EB' : '#374151',
                      background: isSelected ? '#EFF6FF' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{slot.label}</span>
                    {isSelected && <i className="fa fa-check text-primary" style={{ fontSize: 12 }} />}
                  </div>
                );
              })
            )}
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
