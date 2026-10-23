import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const CommandPalette = ({ isOpen, onClose, onNewLeadClick }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleAction = (callback) => {
    callback();
    onClose();
  };

  const listItems = [
    {
      category: 'Recent Searches',
      items: [
        { name: 'Sarah Jenkins - Enquiries', icon: 'history', color: 'text-primary', action: () => navigate('/admin/enquiries') },
        { name: 'Data Science Masters Course', icon: 'school', color: 'text-secondary', action: () => navigate('/admin/students') },
      ],
    },
    {
      category: 'Quick Actions',
      items: [
        { name: 'Create New Lead', icon: 'add_circle', color: 'text-tertiary', action: () => onNewLeadClick() },
        { name: 'Trigger Auto-Dialer', icon: 'play_arrow', color: 'text-primary', action: () => navigate('/admin/cold-calling') },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { name: 'Go to Admissions Pipeline', icon: 'arrow_forward', color: 'text-outline', action: () => navigate('/admin/admissions') },
        { name: 'View Fees & Accounts', icon: 'payments', color: 'text-outline', action: () => navigate('/admin/fees') },
        { name: 'Open Support Desk', icon: 'support_agent', color: 'text-outline', action: () => navigate('/admin/support') },
      ],
    },
  ];

  const filteredList = listItems
    .map(group => {
      const filteredGroupItems = group.items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
      return { ...group, items: filteredGroupItems };
    })
    .filter(group => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-on-background/25 backdrop-blur-sm select-none">
      {/* Backdrop click closer */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
        <div className="flex items-center px-4 py-4 border-b border-outline-variant">
          <span className="material-symbols-outlined text-on-surface-variant mr-3">search</span>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none focus:ring-0 font-body-lg text-on-surface outline-none"
            placeholder="Search commands, leads, or courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd className="px-2 py-1 bg-surface-container rounded text-label-sm text-outline">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filteredList.length === 0 ? (
            <div className="p-4 text-center text-body-md text-on-surface-variant">No matching actions found.</div>
          ) : (
            filteredList.map((group) => (
              <div key={group.category} className="mb-2">
                <div className="px-3 py-2 text-label-sm text-outline uppercase tracking-wider">{group.category}</div>
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => handleAction(item.action)}
                    className="flex items-center p-3 rounded-lg hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <span className={`material-symbols-outlined mr-3 ${item.color}`}>{item.icon}</span>
                    <span className="font-body-md text-on-surface">{item.name}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
