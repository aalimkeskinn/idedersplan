import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        {/* CRITICAL: Mobile-optimized main content with safe areas */}
        <div className="mobile-spacing safe-top safe-bottom pt-20 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;