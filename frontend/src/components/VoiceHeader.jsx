import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const VoiceHeader = ({ onCommandPaletteClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 right-0 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-gutter ml-sidebar-width w-[calc(100%-theme(spacing.sidebar-width))] z-20 select-none">
      {/* Search Input Bar */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary outline-none"
            placeholder="Search commands, leads, or agents..."
          />
        </div>
      </div>

      {/* Action Buttons & Profile Menu */}
      <div className="flex items-center gap-4">
        {/* Command Palette Button */}
        <button
          onClick={onCommandPaletteClick}
          className="bg-surface-container-high text-primary px-4 py-2 rounded-full font-bold text-label-md hover:bg-primary hover:text-white transition-all flex items-center gap-2 focus:ring-2 focus:ring-primary ring-offset-2"
        >
          <span className="material-symbols-outlined text-sm">terminal</span>
          <span>Command Palette</span>
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button className="hover:bg-surface-container-low p-2 rounded-full transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface"></span>
          </button>
          <button 
            onClick={() => navigate('/admin/settings')} 
            className="hover:bg-surface-container-low p-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant mx-2"></div>

        {/* Profile Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low p-1.5 rounded-lg transition-colors"
          >
            <div className="text-right hidden md:block select-none">
              <p className="font-label-md text-on-surface leading-none mb-1">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-on-surface-variant font-medium leading-none">{user?.role || 'Head of Admissions'}</p>
            </div>
            <div
              className="w-10 h-10 rounded-full border-2 border-primary-fixed bg-cover bg-center"
              style={{ backgroundImage: `url('${user?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmYIjNUDQ-urizip-edx52z75A4K7LJIAsmF-0TonO2Ffy_Z7xd-05sx8qI0QWghls7og-OaHNVI4RymPuF51LYyGbmgjBoFC2WgGNti2BVCcS3-e1UdylBL-9MV3vak37eCpNc1KQGYTee3OVFBOGj5gp_XhhkD3WFtJhGXsvmq5ptk436fOkuWx35h9VTtqHipyEKFW4zMGRlwjXuOPiLQmx1viI-oLJPZBy_VAXiXgdzdIJ5AfSBY9pvugWv8M0xFa0OugclWXg'}')` }}
            />
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-outline-variant mb-1">
                <p className="text-label-md font-bold text-on-surface truncate">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-on-surface-variant truncate">{user?.email || 'admin@voicecrm.com'}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/admin/settings');
                }}
                className="w-full text-left px-4 py-2 text-body-md hover:bg-surface-container transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
                <span>CRM Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-body-md hover:bg-error-container hover:text-error transition-colors flex items-center gap-2 border-t border-outline-variant mt-1"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default VoiceHeader;
