import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VoiceSidebar from './VoiceSidebar';
import VoiceHeader from './VoiceHeader';
import CommandPalette from './CommandPalette';
import NewLeadModal from './NewLeadModal';
import VoiceCallWidget from './VoiceCallWidget';
import { VoiceCallProvider } from '../contexts/VoiceCallContext';

const VoiceLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2 border-b-2 border-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleNewLeadSave = (leadData) => {
    // In a full implementation, this updates global context or hits the backend.
    // For now, it alerts success in the modal and saves to localStorage if desired.
    const savedLeads = JSON.parse(localStorage.getItem('voicecrm_manual_leads') || '[]');
    savedLeads.unshift(leadData);
    localStorage.setItem('voicecrm_manual_leads', JSON.stringify(savedLeads));

    // Dispatch a custom event to notify current page if it is listening to enquiries/leads
    window.dispatchEvent(new CustomEvent('new_lead_added', { detail: leadData }));
  };

  return (
    <VoiceCallProvider>
      <div className="min-h-screen bg-background text-on-surface antialiased font-sans flex">
        {/* Sidebar Navigation */}
        <VoiceSidebar onNewLeadClick={() => setIsNewLeadOpen(true)} />

        {/* Main Container */}
        <div className="flex-1 ml-sidebar-width flex flex-col min-h-screen">
          {/* Top Header Bar */}
          <VoiceHeader onCommandPaletteClick={() => setIsCommandPaletteOpen(true)} />

          {/* Content Canvas */}
          <main className="flex-1 pt-16 min-h-screen flex flex-col">
            <Outlet />
          </main>
        </div>

        {/* Overlay: Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNewLeadClick={() => setIsNewLeadOpen(true)}
        />

        {/* Overlay: New Lead Modal */}
        <NewLeadModal
          isOpen={isNewLeadOpen}
          onClose={() => setIsNewLeadOpen(false)}
          onSave={handleNewLeadSave}
        />

        {/* VoiceKit Demo Widget — global floating call interface */}
        <VoiceCallWidget />
      </div>
    </VoiceCallProvider>
  );
};

export default VoiceLayout;
