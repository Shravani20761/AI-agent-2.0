import React from 'react';
import { NavLink } from 'react-router-dom';

const VoiceSidebar = ({ onNewLeadClick }) => {
  const navItems = [
    { name: 'Overview', path: '/admin', icon: 'dashboard', fill: true },
    { name: 'Cold Calling', path: '/admin/cold-calling', icon: 'call' },
    { name: 'Enquiries', path: '/admin/enquiries', icon: 'record_voice_over' },
    { name: 'Warm Leads', path: '/admin/warm-leads', icon: 'person_search' },
    { name: 'Follow Ups', path: '/admin/follow-ups', icon: 'event_repeat' },
    { name: 'Admissions', path: '/admin/admissions', icon: 'school' },
    { name: 'Reviews', path: '/admin/reviews', icon: 'star_rate' },
    { name: 'Student Support', path: '/admin/support', icon: 'support_agent' },
    { name: 'Academics', path: '/admin/students', icon: 'menu_book' },
    { name: 'Fees', path: '/admin/fees', icon: 'payments' },
    { name: 'Communication Hub', path: '/admin/communication', icon: 'hub' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-surface border-r border-outline-variant flex flex-col py-base z-30">
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="#0050cb" />
            <path d="M12 20V24M16 16V28M20 12V32M24 16V28M28 20V24" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="font-headline-lg text-[22px] font-black text-primary leading-none">VoiceCRM</h1>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">AI Voice Automation</p>
        </div>
      </div>

      {/* New Lead Action Button */}
      <div className="px-4 mb-6">
        <button
          onClick={onNewLeadClick}
          className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span className="font-label-md text-label-md">New Lead</span>
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1 select-none">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-label-md font-label-md transition-colors duration-150 group ${
                isActive
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={item.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Navigation */}
      <div className="mt-auto px-2 pt-4 border-t border-outline-variant space-y-1">
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-label-md font-label-md transition-colors duration-150 ${
              isActive
                ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span>Settings</span>
        </NavLink>
        <NavLink
          to="/admin/help"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-label-md font-label-md transition-colors duration-150 ${
              isActive
                ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
          <span>Support</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default VoiceSidebar;
