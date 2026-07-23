import TimeSelect from '@/components/common/TimeSelect';

function DateTimeSelectInput({ inputConfig }) {
  const [dateValue = '', timeValue = ''] = String(inputConfig.value || '').split('T');
  const [minDate = '', minTime = ''] = String(inputConfig.min || '').split('T');
  const updateValue = (date, time) => inputConfig.onChange(date ? `${date}T${time || ''}` : '');

  return (
    <div className="row g-2">
      <div className="col-6">
        <label className="form-label mb-1" style={{ fontSize: 11, color: '#6c757d' }}>Date</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={dateValue}
          min={minDate || undefined}
          onChange={e => updateValue(e.target.value, timeValue)}
          autoFocus
        />
      </div>
      <div className="col-6">
        <label className="form-label mb-1" style={{ fontSize: 11, color: '#6c757d' }}>Time</label>
        <TimeSelect
          value={timeValue}
          onChange={time => updateValue(dateValue, time)}
          minTime={dateValue === minDate ? minTime : null}
          allowedMinutes={inputConfig.allowedMinutes}
          required
        />
      </div>
    </div>
  );
}

export default function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  inputConfig = null,
}) {
  if (!show) return null;

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') onConfirm();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1060,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12,
          padding: '28px 32px', maxWidth: 420, width: '90%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="d-flex align-items-center gap-2 mb-2">
            <i
              className={`fa ${confirmVariant === 'danger' ? 'fa-exclamation-triangle text-danger' : 'fa-info-circle text-primary'}`}
              style={{ fontSize: 18 }}
            />
            <h6 className="mb-0 fw-bold">{title}</h6>
          </div>
        )}
        {message && <p style={{ color: '#555', marginBottom: inputConfig ? 12 : 24, lineHeight: 1.6, fontSize: 14 }}>{message}</p>}
        {inputConfig && (
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {inputConfig.label}
            </label>
            {inputConfig.type === 'datetime-select' ? (
              <DateTimeSelectInput inputConfig={inputConfig} />
            ) : (
              <input
                type={inputConfig.type || 'text'}
                className="form-control form-control-sm"
                value={inputConfig.value}
                onChange={e => inputConfig.onChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                min={inputConfig.min}
                autoFocus
              />
            )}
          </div>
        )}
        <div className="d-flex justify-content-end gap-2">
          {onCancel && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
          )}
          <button
            className={`btn btn-${confirmVariant} btn-sm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? <><i className="fa fa-circle-o-notch fa-spin me-1" />Processing...</>
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
