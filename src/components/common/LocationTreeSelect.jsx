import { useState, useRef, useEffect, useMemo } from 'react';

// Convert API tree (_children) to internal format
function buildTree(nodes, depth = 0) {
  return (nodes || []).map(node => ({
    uuid: node.uuid,
    name: node.Name,
    depth,
    children: buildTree(node._children, depth + 1),
  }));
}

// Find a node by uuid recursively
function findNode(nodes, uuid) {
  for (const n of nodes) {
    if (n.uuid === uuid) return n;
    const found = findNode(n.children, uuid);
    if (found) return found;
  }
  return null;
}

// Filter tree to only branches that contain matches; keep parent nodes as containers
function filterTree(nodes, q) {
  return nodes.reduce((acc, node) => {
    const filteredChildren = filterTree(node.children, q);
    const matches = node.name.toLowerCase().includes(q);
    if (matches || filteredChildren.length) {
      acc.push({ ...node, children: filteredChildren });
    }
    return acc;
  }, []);
}

// Collect all UUIDs of non-leaf nodes in the filtered tree (they need to be expanded)
function getAllParentUuids(nodes) {
  const set = new Set();
  function walk(nodes) {
    for (const node of nodes) {
      if (node.children.length) {
        set.add(node.uuid);
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return set;
}

function TreeNode({ node, selectedUuid, onSelect, expandedSet, onToggle, isSearching }) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedSet.has(node.uuid);
  const isSelected = node.uuid === selectedUuid;

  // Clicking the row selects the node (parents included).
  // The caret icon is a separate target that only toggles expand/collapse.
  const handleRowClick = () => onSelect(node.uuid);
  const handleCaretClick = (e) => { e.stopPropagation(); onToggle(node.uuid); };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '7px 10px',
          paddingLeft: `${10 + node.depth * 18}px`,
          cursor: 'pointer',
          background: isSelected ? '#e8f6f8' : 'transparent',
          color: isSelected ? '#17a2b8' : '#333',
          fontWeight: isSelected ? 600 : 400,
          borderLeft: isSelected ? '3px solid #17a2b8' : '3px solid transparent',
          fontSize: '13px',
          userSelect: 'none',
        }}
        onClick={handleRowClick}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#e8f6f8' : 'transparent'; }}
      >
        {/* Caret toggles expand/collapse; clicking the label selects */}
        {hasChildren && !isSearching ? (
          <span
            style={{ marginRight: '6px', color: '#aaa', fontSize: '12px', width: '14px', flexShrink: 0 }}
            onClick={handleCaretClick}
          >
            <i className={`fa fa-${isExpanded ? 'caret-down' : 'caret-right'}`} />
          </span>
        ) : (
          <span style={{ marginRight: '6px', width: '14px', flexShrink: 0 }}>
            <i className="fa fa-circle" style={{ fontSize: '5px', color: '#ccc', verticalAlign: 'middle' }} />
          </span>
        )}

        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>

      {hasChildren && (isExpanded || isSearching) && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.uuid}
              node={child}
              selectedUuid={selectedUuid}
              onSelect={onSelect}
              expandedSet={expandedSet}
              onToggle={onToggle}
              isSearching={isSearching}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationTreeSelect({
  locationTree = [],
  value,
  onChange,
  placeholder = '-- Select Location --',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedSet, setExpandedSet] = useState(new Set());
  const containerRef = useRef(null);

  const tree = useMemo(() => buildTree(locationTree), [locationTree]);
  // Expand all root nodes by default when tree loads
  useEffect(() => {
    if (tree.length) {
      setExpandedSet(new Set(tree.map(n => n.uuid)));
    }
  }, [tree]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedNode = value ? findNode(tree, value) : null;
  const isSearching = search.length > 0;

  // Filtered tree (pruned to matching branches only when searching)
  const filteredTree = useMemo(() => {
    if (!isSearching) return tree;
    return filterTree(tree, search.toLowerCase());
  }, [isSearching, search, tree]);

  // Auto-expand all parent nodes in the filtered tree during search
  const searchExpandedSet = useMemo(() => {
    if (!isSearching) return expandedSet;
    return getAllParentUuids(filteredTree);
  }, [isSearching, filteredTree]);

  const handleToggle = (uuid) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const handleSelect = (uuid) => {
    onChange(uuid);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <div
        className="form-control form-control-sm d-flex justify-content-between align-items-center"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          background: disabled ? '#e9ecef' : '#fff',
          color: selectedNode ? '#333' : '#999',
        }}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedNode ? selectedNode.name : placeholder}
        </span>
        {value && !disabled && (
          <i
            className="fa fa-times text-muted me-2"
            style={{ fontSize: '11px', flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); onChange(''); }}
          />
        )}
        <i
          className={`fa fa-chevron-${open ? 'up' : 'down'} text-muted`}
          style={{ fontSize: '11px', flexShrink: 0 }}
        />
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ position: 'relative' }}>
              <i className="fa fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: '12px' }} />
              <input
                autoFocus
                type="text"
                className="form-control form-control-sm"
                placeholder="Search locations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ paddingLeft: '28px', borderRadius: '6px' }}
              />
            </div>
          </div>

          {/* Tree (always shown as tree, search auto-expands matching branches) */}
          <div style={{ overflowY: 'auto', maxHeight: '280px' }}>
            {filteredTree.length === 0 ? (
              <div className="text-muted text-center py-3" style={{ fontSize: '13px' }}>
                {isSearching
                  ? <><i className="fa fa-search me-1" />No results found</>
                  : 'No locations available'}
              </div>
            ) : (
              filteredTree.map(node => (
                <TreeNode
                  key={node.uuid}
                  node={node}
                  selectedUuid={value}
                  onSelect={handleSelect}
                  expandedSet={isSearching ? searchExpandedSet : expandedSet}
                  onToggle={handleToggle}
                  isSearching={isSearching}
                />
              ))
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
          style={{ opacity: 0, position: 'absolute', bottom: 0, left: 0, width: '100%', height: '1px', pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
