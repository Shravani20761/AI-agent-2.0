import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VoiceSidebar from './VoiceSidebar';
import VoiceHeader from './VoiceHeader';
import CommandPalette from './CommandPalette';
import NewLeadModal from './NewLeadModal';
import { useToast } from './ui/Toast';

const VoiceLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const { showInfo } = useToast();

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

  const handleMicClick = () => {
    showInfo("Voice Assistant is listening... Speak your CRM command.");
  };

  return (
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

      {/* Simulated AI Voice Agent Floating Indicator (Persisting at bottom-right) */}
      <div 
        onClick={handleMicClick}
        className="fixed bottom-6 right-6 flex items-center gap-3 bg-primary text-white px-4 py-3 rounded-full shadow-2xl z-40 animate-pulse hover:animate-none active:scale-95 transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
        <div className="flex flex-col select-none">
          <span className="text-[11px] font-bold tracking-wider leading-tight uppercase">AI Voice Agent</span>
          <span className="text-[9px] opacity-80 leading-none">Listening for commands...</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceLayout;
