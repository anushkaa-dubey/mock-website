import { useState } from 'react';

export default function SidebarList({
  title,
  icon,
  items = [],
  selectedId,
  onSelect,
  onDelete,
  search,
  onSearch,
  showAddForm,
  onAddClick,
  addForm,
  deletingId,
  activatingId,
  isDeletable = () => true,
  emptyText = 'No items.',
  searchPlaceholder = 'Search...',
}) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <>
      <h6 className="fw-bold text-primary-dark border-bottom-primary pb-2 mb-3" style={{ fontSize: 14, letterSpacing: '-0.01em' }}>
        <i className={`fa ${icon} me-2`} style={{ color: '#17A2B8' }} />{title}
      </h6>

      <div className="d-flex gap-2 mb-3 align-items-center">
        <div style={{ position: 'relative', flex: 1 }}>
          <i
            className="fa fa-search"
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              fontSize: 12,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="form-control"
            style={{
              height: 36,
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              paddingLeft: 32,
              paddingRight: 10,
              fontSize: 13,
              color: '#111827',
              boxShadow: 'none',
            }}
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
        {!showAddForm && (
          <button
            className="btn btn-primary-dark btn-sm flex-shrink-0"
            style={{
              height: 36,
              width: 36,
              padding: 0,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#17A2B8',
              border: 'none',
              color: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title="Add"
            onClick={onAddClick}
          >
            <i className="fa fa-plus" style={{ fontSize: 12 }} />
          </button>
        )}
      </div>

      {showAddForm && addForm}

      <ul className="list-unstyled mb-0 flex-grow-1" style={{ overflowY: 'auto' }}>
        {items.map(item => {
          const isActivating = activatingId === item.id;
          const isDeleting   = deletingId   === item.id;
          const isHovered    = hoveredId    === item.id;
          const isSelected   = selectedId   === item.id;
          const canDelete    = isDeletable(item.id);

          return (
            <li
              key={item.id}
              className="d-flex align-items-center justify-content-between px-3 py-2 mb-1"
              style={{
                minHeight: 38,
                borderRadius: 8,
                cursor: isActivating ? 'wait' : 'pointer',
                background: isSelected ? '#E8F6F8' : isHovered ? '#F9FAFB' : 'transparent',
                borderLeft: isSelected ? '3.5px solid #17A2B8' : '3.5px solid transparent',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => !isActivating && onSelect(item.id)}
            >
              <span
                className="me-2 text-truncate"
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? '#0D9488' : '#374151',
                }}
              >
                {isActivating && <i className="fa fa-circle-o-notch fa-spin me-2 text-primary" />}
                {item.label}
              </span>
              {canDelete && (
                <button
                  className="btn btn-sm text-danger d-flex align-items-center justify-content-center"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 16,
                    opacity: isHovered || isDeleting ? 1 : 0,
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                    borderRadius: 4,
                  }}
                  onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                  disabled={isDeleting}
                  title="Delete"
                  tabIndex={isHovered ? 0 : -1}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {isDeleting ? <i className="fa fa-circle-o-notch fa-spin" /> : <i className="fa fa-trash-o" />}
                </button>
              )}
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-muted small px-3 py-3 text-center" style={{ fontSize: 12.5 }}>{emptyText}</li>
        )}
      </ul>
    </>
  );
}
