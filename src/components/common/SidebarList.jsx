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
      <h6 className="fw-bold text-primary-dark border-bottom-primary pb-2 mb-3">
        <i className={`fa ${icon} me-2`} />{title}
      </h6>

      <div className="d-flex gap-2 mb-2 align-items-center">
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="fa fa-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 12, pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ paddingLeft: 28 }}
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
        {!showAddForm && (
          <button className="btn btn-primary-dark btn-sm flex-shrink-0" title="Add" onClick={onAddClick}>
            <i className="fa fa-plus" />
          </button>
        )}
      </div>

      {showAddForm && addForm}

      <ul className="list-unstyled mb-0 flex-grow-1" style={{ overflowY: 'auto' }}>
        {items.map(item => {
          const isActivating = activatingId === item.id;
          const isDeleting   = deletingId   === item.id;
          const isHovered    = hoveredId    === item.id;
          const canDelete    = isDeletable(item.id);

          return (
            <li
              key={item.id}
              className={`d-flex align-items-center justify-content-between px-2 py-2 rounded mb-1 ${selectedId === item.id ? 'bg-primary-light' : ''}`}
              style={{ cursor: isActivating ? 'wait' : 'pointer' }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => !isActivating && onSelect(item.id)}
            >
              <span className={`me-2 small ${selectedId === item.id ? 'fw-semibold text-dark' : 'text-muted'}`}>
                {isActivating && <i className="fa fa-circle-o-notch fa-spin me-1 text-primary" />}
                {item.label}
              </span>
              {canDelete && (
                <button
                  className="btn btn-sm btn-link text-danger p-0 ms-1"
                  style={{ fontSize: '0.75rem', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}
                  onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                  disabled={isDeleting}
                  title="Delete"
                  tabIndex={isHovered ? 0 : -1}
                >
                  {isDeleting ? <i className="fa fa-circle-o-notch fa-spin" /> : <i className="fa fa-trash" />}
                </button>
              )}
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-muted small px-2 py-2">{emptyText}</li>
        )}
      </ul>
    </>
  );
}
