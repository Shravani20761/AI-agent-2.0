import { createContext, useContext, useState, useCallback } from 'react';

const VoiceCallContext = createContext(null);

export function VoiceCallProvider({ children }) {
  const [activeCall, setActiveCall] = useState(null);

  const startCall = useCallback((contact) => {
    setActiveCall({ contact, startedAt: Date.now() });
  }, []);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return (
    <VoiceCallContext.Provider value={{ activeCall, startCall, endCall }}>
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) throw new Error('useVoiceCall must be inside VoiceCallProvider');
  return ctx;
}
