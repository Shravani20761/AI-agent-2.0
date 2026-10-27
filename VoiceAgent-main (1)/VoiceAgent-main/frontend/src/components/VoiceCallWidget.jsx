import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useVoiceCall } from '../contexts/VoiceCallContext';
import { voicekitApi } from '../api/voicekit.api';

// ─── Demo contact used when no real contact is selected ───────────────────────
const DEFAULT_DEMO_CONTACT = {
  name: 'Rahul Sharma',
  phone: '+91 98765 43210',
  courseHint: 'IIT-JEE Preparation',
};

// ─── Scripted fallback when LiveKit connection fails ──────────────────────────
const buildScript = (contact) => {
  const firstName = contact?.name ? contact.name.split(' ')[0] : 'there';
  const course    = contact?.courseHint || 'our IIT-JEE preparation course';
  const phone     = contact?.phone || '';
  return [
    {
      text: `Hello ${firstName}! This is Priya calling from Seagull Science Academy. Am I speaking with you at a good time?`,
      listenAfter: true,
    },
    {
      text: `Wonderful! I'm reaching out because we just opened fresh batch registrations for ${course}. Our students consistently achieve excellent results — several cleared JEE Advanced this year itself.`,
      listenAfter: true,
    },
    {
      text: `We'd love to invite you to a completely free demo class so you can experience our teaching style and meet the faculty personally. Would you be open to attending one this week?`,
      listenAfter: true,
    },
    {
      text: `That's fantastic${firstName !== 'there' ? ', ' + firstName : ''}! I'll have our counselling team send you the demo class details${phone ? ' on ' + phone : ''} right away. Is there anything specific about the course structure or batch timings you'd like to know?`,
      listenAfter: true,
    },
    {
      text: `Perfect! Thank you so much for your time. We genuinely look forward to meeting you at the demo class. Have a wonderful day, and don't hesitate to call us back if you have any questions at all!`,
      listenAfter: false,
    },
  ];
};

// ─── Waveform visualiser ──────────────────────────────────────────────────────
const BAR_HEIGHTS = [4, 6, 10, 16, 22, 28, 22, 16, 10, 6, 4, 5, 9, 15, 20, 26, 20, 15, 9, 5, 4, 7, 12, 18, 24, 18, 12, 7, 4, 6];

function Waveform({ active, color = 'primary' }) {
  return (
    <div className="flex items-center justify-center gap-[2.5px] h-12">
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className={`rounded-full bg-${color} transition-all duration-150`}
          style={{
            width: 3,
            height: active ? `${h}px` : '3px',
            opacity: active ? 0.7 + (i % 3) * 0.1 : 0.25,
            animation: active ? `waveBar ${0.35 + (i % 6) * 0.08}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${(i % 8) * 0.055}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Transcript bubble ────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isAgent = msg.speaker === 'agent';
  return (
    <div className={`flex gap-2 ${isAgent ? '' : 'flex-row-reverse'}`}>
      <div className={`w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-black ${
        isAgent ? 'bg-primary text-white' : 'bg-secondary-container text-on-secondary-container'
      }`}>
        {isAgent ? 'P' : 'U'}
      </div>
      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-[11.5px] leading-relaxed ${
        isAgent
          ? 'bg-primary/10 text-on-surface rounded-tl-sm'
          : 'bg-surface-container text-on-surface rounded-tr-sm'
      }`}>
        {msg.text}
        {msg.typing && <span className="ml-1 inline-block animate-pulse text-on-surface-variant">●●●</span>}
      </div>
    </div>
  );
}

// ─── Call state machine ───────────────────────────────────────────────────────
const S = { IDLE: 'IDLE', COUNTDOWN: 'COUNTDOWN', CONNECTING: 'CONNECTING', RINGING: 'RINGING', IN_CALL: 'IN_CALL', ENDED: 'ENDED' };

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function VoiceCallWidget() {
  const { activeCall, endCall } = useVoiceCall();

  const [expanded,      setExpanded]      = useState(true);
  const [state,         setState]         = useState(S.COUNTDOWN);
  const [countdown,     setCountdown]     = useState(3);
  const [transcript,    setTranscript]    = useState([]);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [elapsed,       setElapsed]       = useState(0);
  const [mode,          setMode]          = useState('livekit'); // 'livekit' | 'demo'
  const [lkServer,      setLkServer]      = useState('');

  const roomRef      = useRef(null);
  const audioEls     = useRef([]);
  const scriptRef    = useRef([]);
  const timerRef     = useRef(null);
  const countRef     = useRef(null);
  const transcriptEnd = useRef(null);
  const recRef       = useRef(null);

  useEffect(() => {
    const url = import.meta.env.VITE_LIVEKIT_URL || '';
    setLkServer(url.replace('wss://', ''));
  }, []);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ── Elapsed call timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (state === S.IN_CALL) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [state]);

  // ── Countdown then auto-begin ─────────────────────────────────────────────
  useEffect(() => {
    if (state !== S.COUNTDOWN) return;
    setCountdown(3);
    let c = 3;
    countRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countRef.current);
        beginCall(activeCall?.contact || DEFAULT_DEMO_CONTACT);
      }
    }, 1000);
    return () => clearInterval(countRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ── When ColdCalling page triggers a real contact ─────────────────────────
  useEffect(() => {
    if (!activeCall) return;
    clearInterval(countRef.current);
    disconnectRoom();
    window.speechSynthesis?.cancel();
    recRef.current?.stop();
    setTranscript([]);
    setElapsed(0);
    setActiveSpeaker(null);
    setExpanded(true);
    beginCall(activeCall.contact || DEFAULT_DEMO_CONTACT);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.startedAt]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnectRoom();
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── LiveKit room teardown ────────────────────────────────────────────────
  const disconnectRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    audioEls.current.forEach(el => { try { el.pause(); el.remove(); } catch {} });
    audioEls.current = [];
  }, []);

  // ─── Real LiveKit call ────────────────────────────────────────────────────
  const beginLiveKitCall = useCallback(async (contact) => {
    let tokenData;
    try {
      tokenData = await voicekitApi.createToken(
        `voicecrm-demo-${Date.now()}`,
        contact?.name || 'Demo User',
      );
    } catch {
      beginDemoFallback(contact);
      return;
    }

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.Connected, async () => {
      setState(S.RINGING);
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        // Mic permission denied — continue without mic
      }
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      setState(S.IN_CALL);
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const local = room.localParticipant;
      const agentSpeaking = speakers.some(p => p !== local && p.isSpeaking);
      const userSpeaking  = local.isSpeaking;
      setActiveSpeaker(agentSpeaking ? 'agent' : userSpeaking ? 'user' : null);
      setIsListening(userSpeaking);
    });

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        document.body.appendChild(el);
        audioEls.current.push(el);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
    });

    room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      const isAgent = participant !== room.localParticipant;
      segments
        .filter(seg => seg.final && seg.text?.trim())
        .forEach(seg => {
          setTranscript(prev => {
            if (prev.some(m => m.id === seg.id)) return prev;
            return [...prev, { id: seg.id, speaker: isAgent ? 'agent' : 'user', text: seg.text }];
          });
        });
    });

    room.on(RoomEvent.Disconnected, () => {
      setState(prev => (prev === S.IN_CALL ? S.ENDED : prev));
      setActiveSpeaker(null);
      setIsListening(false);
    });

    try {
      await room.connect(tokenData.url, tokenData.token);
      setMode('livekit');
    } catch {
      disconnectRoom();
      beginDemoFallback(contact);
    }
  }, [disconnectRoom]);

  // ─── Scripted demo fallback (Web Speech API) ──────────────────────────────
  const speakText = useCallback((text, onDone) => {
    if (!window.speechSynthesis) { setTimeout(onDone, 2000); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'en-IN';
    utt.rate  = 0.93;
    utt.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v => /female/i.test(v.name) && /en/i.test(v.lang))
              || voices.find(v => /en.IN/i.test(v.lang))
              || voices.find(v => /en/i.test(v.lang));
    if (pick) utt.voice = pick;
    utt.onend   = () => { setActiveSpeaker(null); onDone?.(); };
    utt.onerror = () => { setActiveSpeaker(null); onDone?.(); };
    setActiveSpeaker('agent');
    window.speechSynthesis.speak(utt);
  }, []);

  const listenForReply = useCallback((onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || isMuted) {
      setActiveSpeaker('user');
      setIsListening(true);
      setTimeout(() => { setActiveSpeaker(null); setIsListening(false); onResult(''); }, 2400);
      return;
    }
    const rec = new SR();
    rec.lang            = 'en-IN';
    rec.interimResults  = false;
    rec.maxAlternatives = 1;
    rec.onstart  = () => { setIsListening(true); setActiveSpeaker('user'); };
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); };
    rec.onerror  = ()  => { setIsListening(false); setActiveSpeaker(null); onResult(''); };
    rec.onend    = ()  => { setIsListening(false); setActiveSpeaker(null); };
    recRef.current = rec;
    try { rec.start(); } catch { onResult(''); }
  }, [isMuted]);

  const runStep = useCallback((idx, contact) => {
    const script = scriptRef.current;
    if (idx >= script.length) { setState(S.ENDED); return; }
    const step = script[idx];
    setTranscript(prev => [...prev, { id: `a-${idx}`, speaker: 'agent', text: '', typing: true }]);
    setTimeout(() => {
      setTranscript(prev => prev.map(m =>
        m.id === `a-${idx}` ? { ...m, text: step.text, typing: false } : m
      ));
      speakText(step.text, () => {
        if (!step.listenAfter) { setTimeout(() => setState(S.ENDED), 1200); return; }
        listenForReply((userText) => {
          if (userText) {
            setTranscript(prev => [...prev, { id: `u-${idx}`, speaker: 'user', text: userText }]);
          }
          setTimeout(() => runStep(idx + 1, contact), 600);
        });
      });
    }, 650);
  }, [speakText, listenForReply]);

  const beginDemoFallback = useCallback((contact) => {
    setMode('demo');
    scriptRef.current = buildScript(contact);
    setTimeout(() => {
      setState(S.RINGING);
      setTimeout(() => {
        setState(S.IN_CALL);
        runStep(0, contact);
      }, 1800);
    }, 800);
  }, [runStep]);

  // ─── Unified entry point ──────────────────────────────────────────────────
  const beginCall = useCallback((contact) => {
    setState(S.CONNECTING);
    setTranscript([]);
    setElapsed(0);
    beginLiveKitCall(contact);
  }, [beginLiveKitCall]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handleEnd = useCallback(async () => {
    clearInterval(countRef.current);
    clearInterval(timerRef.current);
    disconnectRoom();
    window.speechSynthesis?.cancel();
    recRef.current?.stop();
    setActiveSpeaker(null);
    setIsListening(false);
    setState(S.ENDED);
    endCall();
  }, [disconnectRoom, endCall]);

  const handleStartNow = useCallback(() => {
    clearInterval(countRef.current);
    beginCall(activeCall?.contact || DEFAULT_DEMO_CONTACT);
  }, [activeCall, beginCall]);

  const handleRestart = useCallback(() => {
    disconnectRoom();
    setState(S.COUNTDOWN);
    setTranscript([]);
    setElapsed(0);
    setMode('livekit');
  }, [disconnectRoom]);

  const handleMute = useCallback(() => {
    const m = !isMuted;
    setIsMuted(m);
    if (roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(!m);
    } else {
      if (m) recRef.current?.stop();
    }
  }, [isMuted]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const contact = activeCall?.contact || DEFAULT_DEMO_CONTACT;
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const isLive  = state === S.IN_CALL;
  const isPrep  = state === S.COUNTDOWN;

  const statusLabel = {
    [S.IDLE]:       'Ready',
    [S.COUNTDOWN]:  `Auto-starting in ${countdown}…`,
    [S.CONNECTING]: 'Connecting…',
    [S.RINGING]:    mode === 'livekit' ? 'Waiting for AI agent…' : 'Ringing…',
    [S.IN_CALL]:    `In Call · ${fmtTime(elapsed)}`,
    [S.ENDED]:      'Call Ended',
  }[state];

  const dotClass = {
    [S.IDLE]:       'bg-outline',
    [S.COUNTDOWN]:  'bg-tertiary animate-pulse',
    [S.CONNECTING]: 'bg-tertiary animate-pulse',
    [S.RINGING]:    'bg-warning animate-ping',
    [S.IN_CALL]:    'bg-secondary animate-pulse',
    [S.ENDED]:      'bg-error',
  }[state];

  const modeLabel = mode === 'livekit' ? 'LIVE · AI' : 'DEMO MODE';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes waveBar { from { transform: scaleY(0.25); } to { transform: scaleY(1); } }
      `}</style>

      {/* ── Collapsed pill ── */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <span className="relative">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isLive ? 'phone_in_talk' : 'mic'}
            </span>
            {isLive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary border-2 border-primary animate-pulse" />
            )}
          </span>
          <div className="text-left select-none">
            <p className="text-[11px] font-black tracking-widest uppercase leading-none">VoiceKit</p>
            <p className="text-[9px] opacity-75 leading-none mt-0.5">{isLive ? fmtTime(elapsed) : 'Tap to open'}</p>
          </div>
        </button>
      )}

      {/* ── Full widget panel ── */}
      {expanded && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] flex flex-col bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-black text-white text-sm shrink-0">
              P
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[13px] leading-tight">Priya · AI Voice Agent</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                <span className="text-white/80 text-[10px] font-medium">{statusLabel}</span>
                <span className="ml-1 border border-white/25 rounded px-1 py-0.5 text-[8px] text-white/60 font-bold tracking-wide">
                  {modeLabel}
                </span>
              </div>
            </div>
            <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">minimize</span>
            </button>
          </div>

          {/* Contact strip */}
          <div className="px-4 py-2.5 bg-surface-container border-b border-outline-variant flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-[11px] shrink-0">
              {(contact.name || '?').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-on-surface text-[12px] leading-tight truncate">{contact.name}</p>
              <p className="text-on-surface-variant text-[10px] font-mono truncate">{contact.phone}</p>
            </div>
            {contact.courseHint && (
              <span className="shrink-0 text-[9px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-bold max-w-[100px] truncate">
                {contact.courseHint}
              </span>
            )}
          </div>

          {/* Waveform / status area */}
          <div className="px-4 py-3 bg-gradient-to-b from-surface-container to-surface-container-lowest border-b border-outline-variant shrink-0">
            {state === S.COUNTDOWN && (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-outline/20" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
                      className="text-primary transition-all duration-1000"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (countdown / 3)}`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="text-primary font-black text-xl">{countdown}</span>
                </div>
                <p className="text-on-surface-variant text-[11px] text-center">AI voice call auto-starting…</p>
                <button onClick={handleStartNow} className="text-primary text-[11px] font-bold hover:underline">
                  Start Now ↗
                </button>
              </div>
            )}

            {state === S.CONNECTING && (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-on-surface-variant text-[11px]">Establishing secure WebRTC session…</p>
              </div>
            )}

            {state === S.RINGING && (
              <div className="flex items-center justify-center gap-3 py-1">
                <span className="material-symbols-outlined text-tertiary text-[28px] animate-bounce"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {mode === 'livekit' ? 'smart_toy' : 'ring_volume'}
                </span>
                <div>
                  <p className="text-tertiary font-bold text-[13px]">
                    {mode === 'livekit' ? 'Waiting for AI agent…' : 'Ringing…'}
                  </p>
                  <p className="text-on-surface-variant text-[10px]">
                    {mode === 'livekit' ? 'LiveKit dispatching Priya' : 'Waiting for answer'}
                  </p>
                </div>
              </div>
            )}

            {(state === S.IN_CALL || state === S.ENDED) && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-0.5 mb-1">
                  <span className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${activeSpeaker === 'agent' ? 'text-primary' : 'text-outline'}`}>
                    <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                    Priya
                  </span>
                  <span className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${isListening ? 'text-secondary' : 'text-outline'}`}>
                    You
                    <span className="material-symbols-outlined text-[12px]">{isMuted ? 'mic_off' : 'mic'}</span>
                  </span>
                </div>
                <Waveform active={isLive && activeSpeaker === 'agent'} color="primary" />
                {isListening && (
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
                    <p className="text-secondary text-[10px] font-bold animate-pulse">Listening…</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-[90px] max-h-[200px]">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                <span className="material-symbols-outlined text-3xl text-outline/40" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPrep ? 'smart_toy' : 'chat'}
                </span>
                <p className="text-on-surface-variant/60 text-[11px]">
                  {isPrep ? 'Real AI voice conversation starts automatically' : 'Call transcript appears here'}
                </p>
              </div>
            ) : (
              transcript.map(msg => <Bubble key={msg.id} msg={msg} />)
            )}
            <div ref={transcriptEnd} />
          </div>

          {/* Controls */}
          <div className="px-4 py-3 bg-surface-container border-t border-outline-variant shrink-0">
            {state === S.ENDED ? (
              <div className="space-y-2">
                <p className="text-center text-[11px] text-on-surface-variant">
                  ✓ Call completed · transcript above
                </p>
                <button onClick={handleRestart}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>phone</span>
                  Start Another Call
                </button>
              </div>
            ) : state === S.COUNTDOWN ? (
              <div className="flex gap-2">
                <button onClick={handleStartNow}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Start Now
                </button>
                <button onClick={() => setExpanded(false)}
                  className="px-4 py-2.5 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container text-[12px] font-bold transition-all">
                  Later
                </button>
              </div>
            ) : state === S.IN_CALL ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleMute}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all text-[10px] font-bold ${
                    isMuted ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{isMuted ? 'mic_off' : 'mic'}</span>
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>

                <button onClick={handleEnd}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-error text-white rounded-xl font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>call_end</span>
                  End Call
                </button>

                <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-[10px] font-bold">
                  <span className="material-symbols-outlined text-[20px]">volume_up</span>
                  Speaker
                </div>
              </div>
            ) : (
              <button disabled
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface-container text-on-surface-variant rounded-xl font-bold text-[13px] opacity-60 cursor-not-allowed">
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Connecting…
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-3">
            <p className="text-[9px] text-outline text-center leading-relaxed">
              {mode === 'livekit'
                ? `LiveKit WebRTC · no AI model loaded${lkServer ? ` · ${lkServer}` : ''}`
                : 'Demo simulation · LiveKit agent not reachable'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
