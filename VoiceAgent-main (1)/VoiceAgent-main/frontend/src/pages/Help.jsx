import React from 'react';
import { useToast } from '../components/ui/Toast';

const Help = () => {
  const { showSuccess } = useToast();

  const faqs = [
    { q: 'How do I activate the Auto-Dialer?', a: 'Navigate to the Cold Calling Campaign dashboard and click "Start Auto-Dialer" at the top right. Make sure your microphone permissions are allowed in the browser.' },
    { q: 'How are visit outcomes recorded?', a: 'In the Admissions Pipeline, click "Record Outcome" on any card under the "Visit Scheduled" column. This opens the feedback modal to log student interest levels.' },
    { q: 'Where are voice call transcripts stored?', a: 'Transcripts and recorded WAV audio files are stored in the Communication Hub, as well as under the AI Communication Log tab inside a student\'s Academics profile.' }
  ];

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Support</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Documentation</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Help Center</h2>
          <p className="text-body-md text-on-surface-variant">User guides and documentation for navigating VoiceCRM voice automations.</p>
        </div>
      </div>

      {/* FAQ Accordions */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-2xl shadow-sm space-y-6">
        <h3 className="font-headline-md text-headline-md text-primary pb-2 border-b border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined">menu_book</span>
          <span>Frequently Asked Questions</span>
        </h3>
        
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="space-y-1 text-left">
              <p className="font-bold text-label-md text-on-surface">{faq.q}</p>
              <p className="text-body-md text-on-surface-variant font-medium">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-outline-variant mt-4 text-center">
          <p className="text-body-md text-on-surface-variant mb-4">Still need assistance with your voice agents?</p>
          <button 
            onClick={() => showSuccess("Support ticket created. We will get back to you shortly.")}
            className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-label-md hover:brightness-110 active:scale-95 transition-all shadow-sm"
          >
            Contact System Administrator
          </button>
        </div>
      </div>
    </div>
  );
};

export default Help;
