import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Building, BookOpen, Calendar, LogOut, Eye, Menu, X, GraduationCap, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Anasayfa', color: 'ide-primary' },
    { to: '/subjects', icon: BookOpen, label: 'Dersler', color: 'ide-orange' },
    { to: '/teachers', icon: Users, label: 'Öğretmenler', color: 'ide-primary' },
    { to: '/classes', icon: Building, label: 'Sınıflar', color: 'ide-secondary' },
    { to: '/schedules', icon: Calendar, label: 'Program Oluştur', color: 'ide-accent' },
    { to: '/class-schedules', icon: GraduationCap, label: 'Sınıf Programları', color: 'ide-secondary' },
    { to: '/all-schedules', icon: Eye, label: 'Öğretmen Programları', color: 'ide-primary' },
    { to: '/pdf', icon: Calendar, label: 'PDF Çıktı', color: 'ide-orange' }
  ];

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-white rounded-lg shadow-ide border border-ide-gray-200 hover:bg-ide-gray-50 focus:outline-none focus:ring-2 focus:ring-ide-primary-500 focus:ring-offset-2 transition-all duration-200"
          aria-label="Menüyü aç/kapat"
        >
          {isMobileMenuOpen ? (
            <X size={24} className="text-ide-gray-700" />
          ) : (
            <Menu size={24} className="text-ide-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-80 lg:w-64 bg-white shadow-ide-xl lg:shadow-ide h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-ide-gray-200 ide-gradient-primary">
          <div className="flex items-center justify-between lg:justify-start">
            <div>
              <h1 className="text-xl font-bold text-white">İDE Okulları</h1>
              <p className="text-sm text-ide-primary-100 mt-1">Ders Programı Sistemi</p>
            </div>
            {/* Mobile close button */}
            <button
              onClick={closeMobileMenu}
              className="lg:hidden p-2 rounded-lg hover:bg-ide-primary-700 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
              aria-label="Menüyü kapat"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto bg-ide-gray-50">
          <ul className="space-y-2">
            {navItems.map(({ to, icon: Icon, label, color }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-4 lg:py-3 rounded-lg transition-all duration-200 text-base lg:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ide-primary-500 focus:ring-offset-2 group relative ${
                      isActive
                        ? `bg-ide-primary-50 text-ide-primary-700 border-r-4 lg:border-r-2 border-ide-primary-700 shadow-ide`
                        : 'text-ide-gray-700 hover:bg-white hover:text-ide-primary-600 hover:shadow-ide'
                    }`
                  }
                >
                  <Icon 
                    size={22} 
                    className="lg:w-5 lg:h-5 flex-shrink-0 transition-colors duration-200 text-ide-gray-500 group-hover:text-ide-primary-500" 
                  />
                  <span className="flex-1">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-ide-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-4 lg:py-3 rounded-lg text-ide-gray-700 hover:bg-ide-accent-50 hover:text-ide-accent-700 transition-all duration-200 w-full text-base lg:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ide-accent-500 focus:ring-offset-2 group"
          >
            <LogOut size={22} className="lg:w-5 lg:h-5 flex-shrink-0 text-ide-gray-500 group-hover:text-ide-accent-500 transition-colors duration-200" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;