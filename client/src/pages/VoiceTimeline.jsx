import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, Play, Pause, Square, SkipBack, SkipForward, Plus, Save, FolderOpen, Scissors, Trash2, ZoomIn, ZoomOut, ImagePlus, Music2 } from 'lucide-react';

const DB_NAME = 'vibepulse-voice-timeline';
const DB_VERSION = 1;
const TRACKS = [
  { id: 'V4', label: 'V4 · Titles / captions', kind: 'visual' },
  { id: 'V3', label: 'V3 · Overlays / effects', kind: 'visual' },
  { id: 'V2', label: 'V2 · Supporting B-roll', kind: 'visual' },
  { id: 'V1', label: 'V1 · Main video / images', kind: 'visual' },
  { id: 'A2', label: 'A2 · Background music', kind: 'audio' },
  { id: 'A3', label: 'A3 · Sound effects', kind: 'audio' },
];
const idOf = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const timecode = (seconds) => {
  const s = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ff = Math.floor((s % 1) * 30);
  return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + ':' + String(ff).padStart(2, '0');
};
function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB is not available in this browser.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('waveforms')) db.createObjectStore('waveforms', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open timeline storage.'));
  });
}
function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Storage request failed.'));
  });
}
async function cachedWaveform(file, thresholdDb, minSilence) {
  const key = [file.name, file.size, file.lastModified, thresholdDb, minSilence].join('|');
  const db = await openDb();
  try {
    const store = db.transaction('waveforms', 'readonly').objectStore('waveforms');
    const cached = await req(store.get(key));
    if (cached?.peaks?.length) return cached;
  } finally { db.close(); }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API is unavailable.');
  const context = new AudioContextClass();
  let result;
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const channelCount = decoded.numberOfChannels;
    const samplesPerPeak = Math.max(256, Math.floor(decoded.sampleRate / 35));
    const peaks = [];
    const silenceRuns = [];
    let quietStart = null;
    let quietCount = 0;
    let currentRun = null;
    const threshold = Math.pow(10, Number(thresholdDb) / 20);
    for (let start = 0; start < decoded.length; start += samplesPerPeak) {
      const end = Math.min(decoded.length, start + samplesPerPeak);
      let sum = 0;
      let peak = 0;
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        const data = decoded.getChannelData(channelIndex);
        for (let i = start; i < end; i += 1) {
          const value = Math.abs(data[i]);
          sum += value * value;
          if (value > peak) peak = value;
        }
      }
      const rms = Math.sqrt(sum / Math.max(1, (end - start) * channelCount));
      const from = start / decoded.sampleRate;
      const to = end / decoded.sampleRate;
      peaks.push({ time: from, rms: Math.min(1, rms), peak: Math.min(1, peak) });
      if (rms < threshold) {
        if (quietStart === null) quietStart = from;
        quietCount += to - from;
        if (!currentRun) currentRun = { start: from, end: to };
        else currentRun.end = to;
      } else {
        if (currentRun && quietCount >= Number(minSilence)) silenceRuns.push({ start: quietStart, end: currentRun.end, duration: currentRun.end - quietStart });
        quietStart = null;
        quietCount = 0;
        currentRun = null;
      }
    }
    if (currentRun && quietCount >= Number(minSilence)) silenceRuns.push({ start: quietStart, end: currentRun.end, duration: currentRun.end - quietStart });
    result = { key, duration: decoded.duration, sampleRate: decoded.sampleRate, peaks, silences: silenceRuns };
  } finally { await context.close().catch(() => {}); }
  const dbSave = await openDb();
  try { await req(dbSave.transaction('waveforms', 'readwrite').objectStore('waveforms').put(result)); } finally { dbSave.close(); }
  return result;
}

export default function VoiceTimeline({ mediaClips = [], onNotice = () => {} }) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const audioTrackRefs = useRef({});
  const rafRef = useRef(0);
  const rulerRef = useRef(null);
  const dragRef = useRef(null);
  const audioUrlRef = useRef('');
  const mediaUrlRef = useRef([]);
  const [voiceFile, setVoiceFile] = useState(null);
  const [voiceUrl, setVoiceUrl] = useState('');
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [waveform, setWaveform] = useState(null);
  const [thresholdDb, setThresholdDb] = useState(-42);
  const [minSilence, setMinSilence] = useState(0.65);
  const [waveformZoom, setWaveformZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clips, setClips] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [savedProjects, setSavedProjects] = useState([]);
  const [projectName, setProjectName] = useState('Voiceover edit');
  const [activeProjectId, setActiveProjectId] = useState('');
  const [notice, setNotice] = useState('Import narration to build a synchronized multitrack edit.');
  const [snap, setSnap] = useState(true);
  const [pendingTrack, setPendingTrack] = useState('V1');
  const [frameStep, setFrameStep] = useState(1);
  const [musicFile, setMusicFile] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [sfxFiles, setSfxFiles] = useState([]);
  const selectedClip = clips.find(c => c.id === selectedId) || null;
  const timelineDuration = Math.max(voiceDuration, clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0), 1);
  const visibleDuration = Math.max(5, timelineDuration);
  const pxPerSecond = 70 * waveformZoom;
  const pixelsWide = visibleDuration * pxPerSecond;

  useEffect(() => {
    let active = true;
    openDb().then(async db => {
      try {
        const all = await req(db.transaction('projects', 'readonly').objectStore('projects').getAll());
        if (active) setSavedProjects(all.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, clipCount: (p.clips || []).length })));
      } catch {} finally { db.close(); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tick = () => {
      if (audio && !audio.paused && !audio.ended) {
        const now = audio.currentTime || 0;
        setPlayhead(now);
        updateVideoAt(now);
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        cancelAnimationFrame(rafRef.current);
      }
    };
    if (playing && audio && voiceUrl) {
      audio.play().then(() => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(tick); })
        .catch(() => { setPlaying(false); setNotice('Browser blocked audio playback. Press Play again to allow it.'); });
    } else if (audio) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, voiceUrl]);

  useEffect(() => {
    const target = activeVisual(playhead);
    if (target?.type === 'video' && videoRef.current) {
      const clipTime = clamp(target.trimStart + (playhead - target.start), target.trimStart, target.trimStart + target.duration);
      if (Number.isFinite(clipTime) && Math.abs(videoRef.current.currentTime - clipTime) > 0.2 && !videoRef.current.seeking) {
        try { videoRef.current.currentTime = clipTime; } catch {}
      }
      if (playing) videoRef.current.play().catch(() => {}); else videoRef.current.pause();
    }
    clips.filter(c => c.kind === 'audio' && c.track !== 'A1').forEach(c => {
      const el = audioTrackRefs.current[c.id];
      if (!el) return;
      const local = playhead - c.start + c.trimStart;
      if (playing && playhead >= c.start && playhead < c.start + c.duration) {
        if (Math.abs(el.currentTime - local) > 0.25 && !el.seeking) { try { el.currentTime = local; } catch {} }
        el.play().catch(() => {});
      } else { el.pause(); }
    });
  }, [playhead, clips, playing]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    mediaUrlRef.current.forEach(url => URL.revokeObjectURL(url));
    if (musicUrl) URL.revokeObjectURL(musicUrl);
  }, []);

  const activeVisual = useCallback((at) => {
    const order = { V1: 1, V2: 2, V3: 3, V4: 4 };
    return clips.filter(c => c.kind === 'visual' && at >= c.start && at < c.start + c.duration)
      .sort((a, b) => (order[b.track] || 0) - (order[a.track] || 0))[0] || null;
  }, [clips]);

  const updateVideoAt = (at) => {
    const target = clips.filter(c => c.kind === 'visual' && c.type === 'video' && at >= c.start && at < c.start + c.duration)
      .sort((a, b) => ({ V1: 1, V2: 2, V3: 3, V4: 4 }[b.track] || 0) - ({ V1: 1, V2: 2, V3: 3, V4: 4 }[a.track] || 0))[0];
    if (target && videoRef.current) {
      const wanted = clamp(target.trimStart + (at - target.start), target.trimStart, target.trimStart + target.duration);
      if (!videoRef.current.seeking && Math.abs(videoRef.current.currentTime - wanted) > 0.18) {
        try { videoRef.current.currentTime = wanted; } catch {}
      }
    }
  };

  const setMessage = (message) => { setNotice(message); onNotice(message); };

  const analyzeVoice = async (file, threshold = thresholdDb, minDuration = minSilence) => {
    setNotice('Analyzing the actual audio samples and detecting pauses…');
    try {
      const result = await cachedWaveform(file, threshold, minDuration);
      setWaveform(result);
      setVoiceDuration(result.duration);
      setMessage('Actual waveform ready: ' + result.peaks.length + ' audio windows and ' + result.silences.length + ' silence regions detected.');
    } catch (error) {
      setWaveform(null);
      setMessage('Could not analyze this audio: ' + (error.message || 'unsupported audio format'));
    }
  };

  const importVoice = async (file) => {
    if (!file || !file.type.startsWith('audio/')) { setMessage('Choose a supported audio narration file.'); return; }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(file);
    audioUrlRef.current = url;
    setVoiceFile(file);
    setVoiceUrl(url);
    setPlayhead(0);
    setPlaying(false);
    setWaveform(null);
    setVoiceDuration(0);
    setNotice('Voiceover imported. Analyzing audio samples…');
    await analyzeVoice(file);
  };

  const snapTime = (value, movingId = '') => {
    let t = Math.max(0, value);
    if (!snap) return t;
    const candidates = [playhead, ...clips.filter(c => c.id !== movingId).flatMap(c => [c.start, c.start + c.duration]), ...(waveform?.silences || []).flatMap(s => [s.start, s.end])];
    const closest = candidates.reduce((best, candidate) => Math.abs(candidate - t) < Math.abs(best - t) ? candidate : best, t);
    return Math.abs(closest - t) <= 0.22 ? closest : t;
  };

  const mediaById = useMemo(() => new Map(mediaClips.map(c => [c.id, c])), [mediaClips]);
  const placeMedia = (source, track, start) => {
    if (!source || !source.file) { setMessage('This media item has no original file attached. Re-import it through Add photos/videos first.'); return; }
    const type = source.type === 'video' ? 'video' : 'image';
    const startAt = snapTime(Math.max(0, start));
    const sourceDuration = type === 'video' ? Number(source.sourceDuration || source.trimEnd || source.duration || 5) : Number(source.duration || 5);
    const duration = type === 'video' ? clamp(Number(source.trimEnd || source.duration || sourceDuration) - Number(source.trimStart || 0), 0.25, sourceDuration) : clamp(Number(source.duration || 5), 0.5, 30);
    const url = URL.createObjectURL(source.file);
    mediaUrlRef.current.push(url);
    const item = { id: idOf(), sourceId: source.id, file: source.file, name: source.name, type, url, kind: 'visual', track, start: startAt, duration, sourceDuration, trimStart: Number(source.trimStart || 0), trimEnd: Number(source.trimEnd || sourceDuration), speed: Number(source.speed || 1) };
    setClips(old => [...old, item]);
    setSelectedId(item.id);
    setMessage('Placed ' + source.name + ' on ' + track + ' at ' + timecode(startAt) + '. Voiceover playback can continue.');
  };

  const importTrackAudio = async (file, track) => {
    if (!file || !file.type.startsWith('audio/')) { setMessage('Choose an audio file.'); return; }
    const url = URL.createObjectURL(file);
    mediaUrlRef.current.push(url);
    let analysis = null;
    try { analysis = await cachedWaveform(file, thresholdDb, minSilence); } catch {}
    const duration = Number(analysis?.duration || 30);
    const item = { id: idOf(), file, name: file.name, type: 'audio', kind: 'audio', track, start: playhead, duration, sourceDuration: duration, trimStart: 0, trimEnd: duration, url, waveform: analysis };
    setClips(old => [...old, item]);
    if (track === 'A2') { setMusicFile(file); setMusicUrl(url); }
    else setSfxFiles(old => [...old, item]);
    setMessage('Added ' + file.name + ' to ' + track + '.');
  };

  const onDropTrack = (event, track) => {
    event.preventDefault();
    const rect = rulerRef.current?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
    const labelOffset = 144;
    const start = Math.max(0, (event.clientX - rect.left + (rulerRef.current?.scrollLeft || 0) - labelOffset) / pxPerSecond);
    const sourceId = event.dataTransfer.getData('application/x-vibepulse-media');
    const clipId = event.dataTransfer.getData('application/x-vibepulse-timeline-clip');
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) return importTrackAudio(file, track);
    if (clipId) {
      setClips(old => old.map(c => c.id === clipId ? { ...c, start: snapTime(start, c.id), track } : c));
      return;
    }
    if (sourceId) return placeMedia(mediaById.get(sourceId), track, start);
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      const fake = { id: idOf(), file, name: file.name, type: file.type.startsWith('video/') ? 'video' : 'image', duration: 5 };
      return placeMedia(fake, track, start);
    }
    placeMedia(mediaById.get(selectedId), track, start);
  };

  const seekTo = (value) => {
    const target = clamp(value, 0, Math.max(voiceDuration, timelineDuration));
    setPlayhead(target);
    if (audioRef.current && voiceUrl) {
      try { audioRef.current.currentTime = Math.min(target, voiceDuration || target); } catch {}
    }
    updateVideoAt(target);
  };

  const stop = () => {
    setPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); try { audioRef.current.currentTime = 0; } catch {} }
    setPlayhead(0);
    updateVideoAt(0);
  };

  const stepFrame = (direction) => seekTo(playhead + direction * frameStep / 30);

  const splitAtPlayhead = () => {
    if (!selectedClip) return;
    const local = playhead - selectedClip.start;
    if (local < 0.25 || local > selectedClip.duration - 0.25) { setMessage('Move the playhead inside the selected clip to split it.'); return; }
    const leftDuration = local;
    const rightDuration = selectedClip.duration - local;
    const hasSourceTimeline = selectedClip.type === 'video' || selectedClip.type === 'audio';
    const left = { ...selectedClip, duration: leftDuration, trimEnd: hasSourceTimeline ? selectedClip.trimStart + leftDuration : selectedClip.trimEnd };
    const right = { ...selectedClip, id: idOf(), start: playhead, duration: rightDuration, trimStart: hasSourceTimeline ? selectedClip.trimStart + leftDuration : selectedClip.trimStart };
    setClips(old => old.flatMap(c => c.id === selectedClip.id ? [left, right] : [c]));
    setSelectedId(right.id);
    setMessage('Clip split at ' + timecode(playhead) + '.');
  };

  const trimSelected = (edge, value) => {
    if (!selectedClip) return;
    const next = Number(value);
    setClips(old => old.map(c => {
      if (c.id !== selectedClip.id) return c;
      const hasSourceTimeline = c.type === 'video' || c.type === 'audio';
      if (edge === 'left') {
        const end = c.start + c.duration;
        const newStart = clamp(next, 0, end - 0.25);
        const delta = newStart - c.start;
        return { ...c, start: newStart, duration: end - newStart, trimStart: hasSourceTimeline ? Math.max(0, c.trimStart + delta) : c.trimStart };
      }
      const duration = clamp(next - c.start, 0.25, Math.max(0.25, c.sourceDuration - c.trimStart));
      return { ...c, duration, trimEnd: hasSourceTimeline ? c.trimStart + duration : c.trimEnd };
    }));
  };

  const saveProject = async () => {
    try {
      const db = await openDb();
      const record = { id: activeProjectId || idOf(), name: projectName, voiceFile, clips: clips.map(({ url, ...c }) => c), thresholdDb, minSilence, waveform, updatedAt: new Date().toISOString(), playhead };
      const tx = db.transaction('projects', 'readwrite');
      await req(tx.objectStore('projects').put(record));
      db.close();
      setActiveProjectId(record.id);
      const nextDb = await openDb();
      const all = await req(nextDb.transaction('projects', 'readonly').objectStore('projects').getAll());
      nextDb.close();
      setSavedProjects(all.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, clipCount: (p.clips || []).length })));
      setMessage('Timeline, source media, waveform peaks, silence regions and clip timing saved in this browser.');
    } catch (error) { setMessage('Could not save timeline: ' + (error.message || 'browser storage unavailable')); }
  };

  const loadProject = async (id) => {
    try {
      const db = await openDb();
      const project = await req(db.transaction('projects', 'readonly').objectStore('projects').get(id));
      db.close();
      if (!project) throw new Error('Project not found');
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      setVoiceFile(project.voiceFile || null);
      const url = project.voiceFile ? URL.createObjectURL(project.voiceFile) : '';
      audioUrlRef.current = url;
      setVoiceUrl(url);
      setWaveform(project.waveform || null);
      setVoiceDuration(project.waveform?.duration || 0);
      setThresholdDb(project.thresholdDb ?? -42);
      setMinSilence(project.minSilence ?? 0.65);
      const restored = (project.clips || []).map(c => ({ ...c, url: URL.createObjectURL(c.file) }));
      restored.forEach(c => mediaUrlRef.current.push(c.url));
      setClips(restored);
      setSelectedId(restored[0]?.id || '');
      setProjectName(project.name || 'Voiceover edit');
      setActiveProjectId(project.id);
      setPlayhead(project.playhead || 0);
      setPlaying(false);
      setMessage('Project reopened with its saved waveform, silence regions, tracks and timings.');
    } catch (error) { setMessage('Could not reopen timeline: ' + (error.message || 'unknown error')); }
  };

  const seekFromPointer = (event) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    seekTo(clamp((event.clientX - rect.left + rulerRef.current.scrollLeft) / pxPerSecond, 0, visibleDuration));
  };

  const renderWave = () => {
    if (!waveform?.peaks?.length) return <div className="px-2 py-3 text-xs text-slate-500">Import voiceover to analyze real audio samples.</div>;
    const width = Math.max(1, Math.ceil(waveform.peaks.length * waveformZoom));
    return <svg width={Math.max(pixelsWide, width)} height="92" className="block cursor-crosshair" aria-label="Actual voiceover waveform; click to seek">
      {waveform.peaks.map((p, i) => {
        const x = i * (waveform.duration / waveform.peaks.length) * pxPerSecond;
        const h = Math.max(2, p.peak * 78);
        const silent = p.rms < Math.pow(10, thresholdDb / 20);
        return <rect key={i} x={x} y={(92 - h) / 2} width={Math.max(1, pxPerSecond * waveform.duration / waveform.peaks.length * 0.78)} height={h} rx="1" fill={silent ? '#64748b' : '#a78bfa'} opacity={silent ? 0.8 : 0.98} />;
      })}
      {(waveform.silences || []).map((s, i) => <g key={'silence-' + i}><rect x={s.start * pxPerSecond} y="0" width={Math.max(2, s.duration * pxPerSecond)} height="92" fill="#f59e0b" opacity="0.22" /><line x1={s.start * pxPerSecond} x2={s.start * pxPerSecond} y1="0" y2="92" stroke="#fbbf24" strokeDasharray="3 3" opacity="0.85"/><line x1={(s.start + s.duration) * pxPerSecond} x2={(s.start + s.duration) * pxPerSecond} y1="0" y2="92" stroke="#fbbf24" strokeDasharray="3 3" opacity="0.85"/><text x={s.start * pxPerSecond + 3} y="12" fill="#fbbf24" fontSize="10">{s.duration.toFixed(1)}s PAUSE</text></g>)}
    </svg>;
  };

  const visualForPreview = activeVisual(playhead);
  const trackColor = (track) => track === 'V1' ? 'border-violet-400/60 bg-violet-500/25' : track === 'V2' ? 'border-sky-400/60 bg-sky-500/20' : track === 'V3' ? 'border-amber-400/60 bg-amber-500/20' : track === 'V4' ? 'border-pink-400/60 bg-pink-500/20' : 'border-emerald-400/60 bg-emerald-500/20';

  return <section className="mt-2 overflow-hidden border border-[#454545] bg-[#242424] p-0 font-sans text-[#d4d4d4] shadow-2xl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#454545] bg-[#303030] px-4 py-3">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#eeeeee]"><AudioLines size={17} className="text-[#83b9ef]" /> AutoCut · Timeline</h2><p className="mt-1 text-[11px] text-[#a9a9a9]">Sequence · synchronized narration · multitrack editing</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={saveProject} className="inline-flex items-center gap-1 border border-[#555] bg-[#383838] px-3 py-1.5 text-[11px] hover:bg-[#484848]"><Save size={14}/> Save timeline</button><select aria-label="Open saved timeline" value="" onChange={e => { if (e.target.value) loadProject(e.target.value); }} className="border border-[#555] bg-[#1f1f1f] px-2 py-1.5 text-[11px] text-[#ddd]"><option value="">Open saved…</option>{savedProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.clipCount})</option>)}</select></div>
    </div>
    <div className="grid gap-px border-b border-[#454545] bg-[#454545] md:grid-cols-[1fr_1fr]">
      <label className="bg-[#2d2d2d] p-3 text-[11px] text-[#bcbcbc]">Project name<input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-1 w-full border border-[#555] bg-[#1d1d1d] px-2 py-1.5 text-sm text-[#eee]" /></label>
      <label className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">Import voiceover / narration<input type="file" accept="audio/*" onChange={e => { importVoice(e.target.files?.[0]); e.target.value = ''; }} className="mt-2 block w-full text-[11px] text-[#bbb]" /></label>
    </div>
    <audio ref={audioRef} src={voiceUrl || undefined} preload="auto" onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration) && !waveform) setVoiceDuration(e.currentTarget.duration); }} onEnded={() => { setPlaying(false); setPlayhead(voiceDuration); }} />
    <div className="flex flex-wrap items-center gap-1 border-b border-[#454545] bg-[#292929] px-3 py-2">
      <button onClick={() => setPlaying(true)} disabled={!voiceUrl} className="inline-flex items-center gap-1 border border-[#3977a8] bg-[#24669a] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2d79b4] disabled:opacity-40"><Play size={14}/> Play</button>
      <button onClick={() => setPlaying(false)} className="inline-flex items-center gap-1 border border-[#555] bg-[#383838] px-3 py-1.5 text-[11px] hover:bg-[#484848]"><Pause size={14}/> Pause</button>
      <button onClick={stop} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs"><Square size={13}/> Stop</button>
      <button onClick={() => stepFrame(-1)} className="border border-[#555] bg-[#383838] px-2 py-1.5 hover:bg-[#484848]" title="Previous frame (30 fps)"><SkipBack size={14}/></button>
      <button onClick={() => stepFrame(1)} className="border border-[#555] bg-[#383838] px-2 py-1.5 hover:bg-[#484848]" title="Next frame (30 fps)"><SkipForward size={14}/></button>
      <span className="border border-[#454545] bg-[#1d1d1d] px-2 py-1 font-mono text-[11px] text-[#9fd2ff]">{timecode(playhead)} / {timecode(timelineDuration)}</span>
      <button onClick={() => setWaveformZoom(v => clamp(v / 1.25, 0.25, 8))} className="ml-auto border border-[#555] bg-[#383838] px-2 py-1.5 hover:bg-[#484848]" title="Zoom out"><ZoomOut size={14}/></button>
      <button onClick={() => setWaveformZoom(v => clamp(v * 1.25, 0.25, 8))} className="rounded-lg border border-white/10 px-2 py-2" title="Zoom in"><ZoomIn size={14}/></button>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-b border-[#454545] bg-[#2d2d2d] px-3 py-2 text-[11px] text-[#bcbcbc]">
      <label>Silence threshold: {thresholdDb} dBFS<input type="range" min="-60" max="-24" step="1" value={thresholdDb} onChange={e => { const value = Number(e.target.value); setThresholdDb(value); if (voiceFile) analyzeVoice(voiceFile, value, minSilence); }} className="ml-2 w-32 align-middle" /></label>
      <label>Minimum silence: {minSilence.toFixed(2)}s<input type="range" min="0.25" max="2.5" step="0.05" value={minSilence} onChange={e => { const value = Number(e.target.value); setMinSilence(value); if (voiceFile) analyzeVoice(voiceFile, thresholdDb, value); }} className="ml-2 w-32 align-middle" /></label>
      <span className="text-amber-200">{waveform?.silences?.length || 0} silence regions</span>
    </div>
    <div ref={rulerRef} className="overflow-auto border-y border-[#454545] bg-[#1b1b1b]" onClick={e => { if (e.target !== rulerRef.current) return; seekFromPointer(e); }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const rect = rulerRef.current.getBoundingClientRect(); const t = Math.max(0, (e.clientX - rect.left + rulerRef.current.scrollLeft - 144) / pxPerSecond); onDropTrack(e, pendingTrack || 'V1'); seekTo(t); }}>
      <div className="relative" style={{ width: Math.max(900, pixelsWide), minWidth: '100%' }}>
        <div className="sticky top-0 z-10 flex h-8 border-b border-[#454545] bg-[#292929]">
          {Array.from({ length: Math.ceil(visibleDuration / 5) + 1 }, (_, i) => <div key={i} style={{ left: i * 5 * pxPerSecond, position: 'absolute' }} className="border-l border-[#444] pl-1 text-[10px] text-[#aaa]">{timecode(i * 5)}</div>)}
        </div>
        <div className="relative flex min-h-[104px] border-b border-[#454545] bg-[#252525]">
          <div className="absolute left-0 top-0 z-10 flex h-full w-36 flex-col justify-center border-r border-[#454545] bg-[#303030] px-2 py-2 text-[11px] font-semibold text-[#8fc7f4]"><span>A1 · Voiceover</span><span className="mt-1 text-[9px] font-normal text-slate-400">{waveform ? (waveform.silences?.length || 0) + ' pauses detected' : 'Import voice to analyze'}</span></div>
          <div className="ml-36 min-h-[104px] cursor-crosshair" style={{ width: Math.max(0, pixelsWide - 144) }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left + rulerRef.current.scrollLeft) / pxPerSecond); }}>
            <div className="relative min-h-[104px]">{renderWave()}</div>
          </div>
        </div>
        {TRACKS.map(track => <div key={track.id} className="relative flex min-h-[70px] border-b border-[#383838] bg-[linear-gradient(to_right,rgba(170,170,170,0.10)_1px,transparent_1px)]" style={{ backgroundSize: (pxPerSecond * 5) + 'px 100%' }} onDragOver={e => e.preventDefault()} onDrop={e => onDropTrack(e, track.id)} onClick={e => { if (!e.target.closest('[data-clip]')) { const rect = rulerRef.current.getBoundingClientRect(); seekTo(Math.max(0, (e.clientX - rect.left + rulerRef.current.scrollLeft - 144) / pxPerSecond)); setPendingTrack(track.id); } }}>
          <div className="absolute left-0 top-0 z-10 flex h-full w-36 items-center border-r border-[#454545] bg-[#303030] px-2 text-[11px] font-semibold text-[#c5c5c5]">{track.label}</div>
          <div className="relative ml-36 min-h-[62px]" style={{ width: Math.max(0, pixelsWide - 144) }}>
            {track.id === 'A2' && <label className="absolute left-2 top-2 z-10 cursor-pointer rounded bg-emerald-900/80 px-2 py-1 text-[10px] text-emerald-100"><Music2 size={10} className="mr-1 inline"/>Add music<input type="file" accept="audio/*" hidden onChange={e => { importTrackAudio(e.target.files?.[0], 'A2'); e.target.value = ''; }}/></label>}
            {track.id === 'A3' && <label className="absolute left-2 top-2 z-10 cursor-pointer rounded bg-emerald-900/80 px-2 py-1 text-[10px] text-emerald-100">Add SFX<input type="file" accept="audio/*" hidden onChange={e => { importTrackAudio(e.target.files?.[0], 'A3'); e.target.value = ''; }}/></label>}
            {clips.filter(c => c.track === track.id).map(c => <div key={c.id} data-clip="true" draggable onDragStart={e => { dragRef.current = c.id; e.dataTransfer.setData('application/x-vibepulse-timeline-clip', c.id); }} onClick={e => { e.stopPropagation(); setSelectedId(c.id); seekTo(c.start); }} className={'absolute top-1 h-14 overflow-hidden rounded-sm border px-2 py-1 text-[10px] shadow-sm ' + (track.id.startsWith('V') ? 'border-[#4f8fca] bg-[#315f8a] text-[#e4f1ff]' : 'border-[#239b70] bg-[#167b59] text-[#e3fff4]') + (selectedId === c.id ? ' ring-2 ring-white' : '')} style={{ left: c.start * pxPerSecond, width: Math.max(34, c.duration * pxPerSecond) }} title={c.name + ' · ' + c.duration.toFixed(2) + 's'}>{c.type === 'image' && <img src={c.url} alt="" draggable="false" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"/>}<span className="relative block truncate font-bold">{c.name}</span><span className="relative">{timecode(c.start)} · {c.duration.toFixed(1)}s</span>{c.kind === 'audio' && c.waveform?.peaks && <svg className="mt-1 block h-4 w-full" viewBox={'0 0 ' + Math.max(1,c.waveform.peaks.length) + ' 16'} preserveAspectRatio="none">{c.waveform.peaks.map((p,i)=><rect key={i} x={i} y={(16-Math.max(1,p.peak*14))/2} width="1" height={Math.max(1,p.peak*14)} fill={p.rms < Math.pow(10,thresholdDb/20) ? '#64748b' : '#6ee7b7'} />)}</svg>}{c.kind === 'audio' && <audio ref={el => { if (el) audioTrackRefs.current[c.id] = el; else delete audioTrackRefs.current[c.id]; }} src={c.url} preload="auto" className="hidden" /> }<button onClick={e => { e.stopPropagation(); setClips(old => old.filter(x => x.id !== c.id)); if (selectedId === c.id) setSelectedId(''); }} className="absolute right-0 top-0 rounded bg-black/40 p-0.5" aria-label="Delete clip"><Trash2 size={10}/></button></div>)}
          </div>
        </div>)}
        <div className="pointer-events-none absolute bottom-0 top-0 z-30" style={{ left: 144 + playhead * pxPerSecond }}><div className="h-full w-[2px] bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]"/><div className="-ml-[5px] h-3 w-3 rounded-b bg-sky-400"/><div className="absolute left-1 top-0 rounded bg-sky-400 px-1 py-0.5 font-mono text-[9px] font-bold text-slate-950">{timecode(playhead)}</div></div>
      </div>
    </div>
    <div className="grid gap-px border-t border-[#454545] bg-[#454545] lg:grid-cols-[1fr_280px]">
      <div className="bg-[#2a2a2a] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#454545] pb-2"><h3 className="text-xs font-bold text-slate-300">Media panel · drag a card onto V1/V2/V3/V4</h3><span className="text-[10px] text-slate-500">Drop position = timeline time</span></div>
        {mediaClips.length ? <div className="flex gap-2 overflow-x-auto pb-2">{mediaClips.map(c => <button key={c.id} draggable onDragStart={e => { e.dataTransfer.setData('application/x-vibepulse-media', c.id); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => { placeMedia(c, pendingTrack, playhead); }} className="w-24 shrink-0 border border-[#555] bg-[#333] p-2 text-left hover:border-[#7eb8e8]"><div className="h-16 overflow-hidden bg-[#151515]">{c.type === 'image' ? <img src={c.url} alt="" className="h-full w-full object-cover"/> : <video src={c.url} muted className="h-full w-full object-cover"/>}</div><div className="mt-1 truncate text-[10px]">{c.name}</div><div className="text-[9px] text-slate-500">Insert at playhead</div></button>)}</div> : <p className="text-xs text-slate-500">Import images/videos in the existing Media panel above, then drag them here.</p>}
        <div className="mt-2 flex flex-wrap gap-2 border-t border-[#454545] pt-2"><label className="cursor-pointer border border-[#555] bg-[#383838] px-3 py-2 text-[11px] hover:bg-[#484848]"><ImagePlus size={13} className="mr-1 inline"/>Import image/video<input type="file" accept="image/*,video/*" multiple hidden onChange={e => { Array.from(e.target.files || []).forEach(file => { const fake = { id: idOf(), file, name: file.name, type: file.type.startsWith('video/') ? 'video' : 'image', duration: 5 }; placeMedia(fake, pendingTrack, playhead); }); e.target.value = ''; }}/></label><label className="flex items-center gap-1 text-xs text-slate-400"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)}/> Snap to playhead / clip edges</label><label className="text-xs text-slate-400">Drop target<select value={pendingTrack} onChange={e => setPendingTrack(e.target.value)} className="ml-2 border border-[#555] bg-[#1f1f1f] p-1 text-[#ddd]">{TRACKS.filter(t => t.kind === 'visual').map(t => <option key={t.id} value={t.id}>{t.id}</option>)}</select></label></div>
      </div>
      <div className="bg-[#2a2a2a] p-3">
        <h3 className="mb-2 border-b border-[#454545] pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#c7c7c7]">Preview monitor</h3>
        <div className="relative grid aspect-video place-items-center overflow-hidden border border-[#454545] bg-[#151515]">
          {visualForPreview?.type === 'image' && <img src={visualForPreview.url} alt="" className="absolute inset-0 h-full w-full object-contain"/>}
          {visualForPreview?.type === 'video' && <video key={visualForPreview.id} ref={videoRef} src={visualForPreview.url} muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-contain" onLoadedMetadata={e => { const target = visualForPreview; try { e.currentTarget.currentTime = target.trimStart + Math.max(0, playhead - target.start); } catch {} }}/>}
          {!visualForPreview && <span className="text-xs text-slate-600">No visual clip at {timecode(playhead)}</span>}
        </div>
        {selectedClip && <div className="mt-3 space-y-3 border border-[#454545] bg-[#222] p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold">{selectedClip.name} · {selectedClip.track}</div><span className="font-mono text-cyan-200">{timecode(selectedClip.start)} → {timecode(selectedClip.start + selectedClip.duration)}</span></div><label className="block">Clip position: {selectedClip.start.toFixed(2)}s<input aria-label="Clip start" type="range" min="0" max={Math.max(0, timelineDuration)} step="0.05" value={selectedClip.start} onChange={e => setClips(old => old.map(c => c.id === selectedClip.id ? { ...c, start: snapTime(Number(e.target.value), c.id) } : c))} className="w-full"/></label><label className="block">Trim start: {selectedClip.trimStart.toFixed(2)}s<input aria-label="Trim start" type="range" min="0" max={Math.max(0, (selectedClip.sourceDuration || selectedClip.duration) - 0.25)} step="0.05" value={selectedClip.trimStart} onChange={e => { const trimStart = Number(e.target.value); const maxDuration = Math.max(0.25, (selectedClip.sourceDuration || selectedClip.duration) - trimStart); setClips(old => old.map(c => c.id === selectedClip.id ? { ...c, trimStart, duration: Math.min(c.duration, maxDuration), trimEnd: trimStart + Math.min(c.duration, maxDuration) } : c)); }} className="w-full"/></label><label className="block">Clip duration: {selectedClip.duration.toFixed(2)}s<input aria-label="Clip duration" type="range" min="0.25" max={Math.max(0.25, (selectedClip.sourceDuration || selectedClip.duration) - selectedClip.trimStart)} step="0.05" value={selectedClip.duration} onChange={e => trimSelected('right', selectedClip.start + Number(e.target.value))} className="w-full"/></label><div className="flex flex-wrap gap-2"><button onClick={() => { setPlayhead(selectedClip.start); seekTo(selectedClip.start); }} className="rounded border border-white/10 px-2 py-1">Go to clip start</button><button onClick={splitAtPlayhead} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1"><Scissors size={12}/> Split at playhead</button><button onClick={() => { setClips(old => old.filter(x => x.id !== selectedClip.id)); setSelectedId(''); }} className="inline-flex items-center gap-1 rounded border border-rose-400/30 px-2 py-1 text-rose-200"><Trash2 size={12}/> Delete clip</button></div></div>}
      </div>
    </div>
    <p className="border-t border-[#454545] bg-[#292929] px-3 py-2 text-[11px] text-[#aaa]">{notice} · Drag media while voiceover is playing or pause at a sentence, insert at playhead, then resume. Waveform shows real sample peaks; silence regions use the configured RMS threshold and minimum duration.</p>
  </section>;
}
