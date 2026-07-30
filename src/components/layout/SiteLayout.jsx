import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function SiteLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="page-wrapper">
      <Navbar onMenuClick={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="content-wrapper">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <main className="main-content with-sidebar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
