import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { demoApi } from '../api/demo.api.js';
import ModeSwitch from '../components/ModeSwitch.jsx';
import CallControls from '../components/CallControls.jsx';
import LiveCostTicker from '../components/LiveCostTicker.jsx';
import ToolCallFeed from '../components/ToolCallFeed.jsx';
import CostComparisonTable from '../components/CostComparisonTable.jsx';
import AgentVisualizer from '../components/AgentVisualizer.jsx';

function releaseAudio(elements) {
  elements.forEach((element) => {
    element.pause?.();
    element.srcObject = null;
    element.remove();
  });
  elements.length = 0;
}

export default function CallRoom() {
  const [config, setConfig] = useState(null);
  const [summary, setSummary] = useState(null);
  const [mode, setMode] = useState('GEMINI_LIVE');
  const [status, setStatus] = useState('IDLE');
  const [contact, setContact] = useState({ name: '', phone: '', course: '' });
  const [call, setCall] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [toolCalls, setToolCalls] = useState([]);
  const [muted, setMuted] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const roomRef = useRef(null);
  const audioRef = useRef([]);
  const callIdRef = useRef(null);

  const refreshSummary = useCallback(async () => {
    const data = await demoApi.getSummary();
    setSummary(data);
    setSummaryError('');
  }, []);

  useEffect(() => {
    let cancelled = false;
    demoApi.getConfig()
      .then((nextConfig) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setMode(nextConfig.activeMode || 'GEMINI_LIVE');
      })
      .catch((loadError) => {
        if (!cancelled) setPageError(loadError.message);
      });
    refreshSummary().catch((loadError) => {
      if (!cancelled) setSummaryError(loadError.message);
    });
    return () => { cancelled = true; };
  }, [refreshSummary]);

  useEffect(() => {
    if (!call?.id || status === 'ENDED' || status === 'IDLE') return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await demoApi.getCall(call.id);
        if (cancelled) return;
        setCall(data.call);
        setToolCalls(data.call.toolCalls || []);
        if (data.call.status !== 'ACTIVE') {
          setStatus('ENDED');
          roomRef.current?.disconnect();
          refreshSummary().catch(() => {});
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError.message);
      }
    };
    poll();
    const timer = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [call?.id, status, refreshSummary]);

  useEffect(() => () => {
    roomRef.current?.disconnect();
    releaseAudio(audioRef.current);
  }, []);

  async function changeMode(nextMode) {
    setError('');
    const previous = mode;
    setMode(nextMode);
    try {
      const data = await demoApi.setMode(nextMode);
      setMode(data.mode);
    } catch (modeError) {
      setMode(previous);
      setError(modeError.message);
    }
  }

  async function startCall() {
    setError('');
    setStatus('CONNECTING');
    setToolCalls([]);
    setMuted(true);
    setAudioBlocked(false);
    try {
      const started = await demoApi.startCall({
        contactName: contact.name,
        contactPhone: contact.phone,
        contactCourse: contact.course,
      });
      callIdRef.current = started.demoCallId;
      setStartedAt(new Date().toISOString());
      setCall({
        id: started.demoCallId,
        mode: started.mode,
        roomName: started.roomName,
        usageCompleteness: 'unavailable',
      });
      setMode(started.mode);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        element.style.display = 'none';
        document.body.appendChild(element);
        audioRef.current.push(element);
        setStatus('IN_CALL');
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setAudioBlocked(!room.canPlaybackAudio);
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localId = room.localParticipant?.identity;
        setAgentSpeaking(speakers.some((p) => p.identity !== localId));
      });
      room.on(RoomEvent.ParticipantConnected, () => setStatus('IN_CALL'));
      room.on(RoomEvent.Disconnected, () => {
        releaseAudio(audioRef.current);
        setAgentSpeaking(false);
        setAudioBlocked(false);
      });

      await room.connect(started.url, started.token);

      // Acquire mic permission upfront then immediately mute — push-to-talk starts silent
      // so the agent can greet without acoustic echo from its own voice.
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(false);
      } catch {
        setError('Microphone permission denied. Hold-to-talk will not work.');
      }
      setMuted(true);

      // Resume the AudioContext — browsers block autoplay until a user gesture.
      try {
        await room.startAudio();
      } catch {
        // AudioPlaybackStatusChanged event will surface the blocked state.
      }
      setAudioBlocked(!room.canPlaybackAudio);

      if (room.remoteParticipants.size > 0) setStatus('IN_CALL');
      else setStatus((current) => (current === 'CONNECTING' ? 'WAITING' : current));
    } catch (startError) {
      setStatus('IDLE');
      setCall(null);
      setStartedAt(null);
      callIdRef.current = null;
      roomRef.current?.disconnect();
      roomRef.current = null;
      setError(startError.message);
    }
  }

  async function endCall() {
    const id = callIdRef.current;
    roomRef.current?.disconnect();
    roomRef.current = null;
    releaseAudio(audioRef.current);
    setAudioBlocked(false);
    if (!id) {
      setStatus('IDLE');
      return;
    }
    try {
      const ended = await demoApi.endCall(id);
      setCall((current) => ({ ...(current || {}), ...ended, id }));
      setStatus('ENDED');
      await refreshSummary();
    } catch (endError) {
      setError(endError.message);
      setStatus('ENDED');
    }
  }

  // Push-to-talk: called with true on press, false on release.
  async function setMicActive(active) {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(active);
      setMuted(!active);
    } catch {
      // Ignore transient toggle errors.
    }
  }

  // Resumes the AudioContext after a user gesture unblocks it.
  async function enableAudio() {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
    } catch {
      setAudioBlocked(true);
    }
  }

  const busy = status === 'CONNECTING' || status === 'WAITING' || status === 'IN_CALL';
  const integrationNote = config?.integrations;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Priya AI · Cost benchmark</h1>
        <p className="mt-1 text-sm text-muted">
          {config?.pricingNote || 'Provisional pricing. A live provider session is unverified until its API key is set.'}
        </p>
      </header>
      {pageError && (
        <p className="rounded-xl border border-danger/30 bg-white px-4 py-3 text-sm text-danger">{pageError}</p>
      )}
      {integrationNote && (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-xs leading-5 text-muted">
          Gemini {integrationNote.geminiLive?.configured ? 'key present' : 'key missing'}, {integrationNote.geminiLive?.note}
          {' '}Sarvam {integrationNote.sarvam?.configured ? 'key present' : 'key missing'}.
          {' '}DeepSeek {integrationNote.deepseek?.configured ? 'key present' : 'key missing'}.
        </p>
      )}
      <ModeSwitch activeMode={mode} disabled={busy} onChange={changeMode} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AgentVisualizer speaking={agentSpeaking} status={status} />
          <LiveCostTicker mode={call?.mode || mode} call={call} startedAt={startedAt} status={status} />
        </div>
        <ToolCallFeed toolCalls={toolCalls} />
      </div>
      <CallControls
        status={status}
        contact={contact}
        onContact={setContact}
        onStart={startCall}
        onEnd={endCall}
        onMicPress={setMicActive}
        muted={muted}
        audioBlocked={audioBlocked}
        onEnableAudio={enableAudio}
        error={error}
      />
      <CostComparisonTable summary={summary} error={summaryError} />
    </main>
  );
}
