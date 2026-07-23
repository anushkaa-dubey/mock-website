import { Link, useLocation, useParams } from 'react-router-dom';

const menuItems = [
  {
    item: 'Dashboard',
    icon: 'fa fa-tachometer',
    path: 'dashboard',
    activePath: 'dashboard',
  },
  {
    item: 'Work Permits',
    icon: 'fa fa-file-text',
    path: 'work-permit/',
    activePath: 'work-permit',
  },
  {
    item: 'Setup',
    icon: 'fa fa-cog',
    path: 'setup',
    activePath: 'setup',
  },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { pathname } = useLocation();
  const { siteId } = useParams();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' sidebar-mobile-open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar${mobileOpen ? ' sidebar-mobile-open' : ''}`}>
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((menu) => {
              const href       = `/site/${siteId}/${menu.path}`;
              const activePath = `/site/${siteId}/${menu.activePath}`;
              const isActive   = pathname.startsWith(activePath);

              return (
                <li key={menu.path} className="nav-item">
                  <Link
                    to={href}
                    className={isActive ? 'active' : ''}
                    title={menu.item}
                    onClick={onClose}
                  >
                    <i className={menu.icon} />
                    <span className="sidebar-label">{menu.item}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
