import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, Play, Pause, Square, SkipBack, SkipForward, Plus, Save, FolderOpen, Scissors, Trash2, ZoomIn, ZoomOut, ImagePlus, Music2, Eye, EyeOff, Lock, Unlock, Volume2, VolumeX, Download, Hand } from 'lucide-react';

const DB_NAME = 'vibepulse-voice-timeline';
const DB_VERSION = 1;
const TRACKS = [
  { id: 'V6', label: 'V6 · Additional graphics', kind: 'visual' },
  { id: 'V5', label: 'V5 · Additional overlays', kind: 'visual' },
  { id: 'V4', label: 'V4 · Titles / captions', kind: 'visual' },
  { id: 'V3', label: 'V3 · Effects / overlays', kind: 'visual' },
  { id: 'V2', label: 'V2 · Supporting B-roll', kind: 'visual' },
  { id: 'V1', label: 'V1 · Main video / images', kind: 'visual' },
  { id: 'A2', label: 'A2 · Background music', kind: 'audio' },
  { id: 'A3', label: 'A3 · Sound effects', kind: 'audio' },
  { id: 'A4', label: 'A4 · Additional audio', kind: 'audio' },
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
  const videoClipRefs = useRef({});
  const audioTrackRefs = useRef({});
  const rafRef = useRef(0);
  const rulerRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const slipRef = useRef(null);
  const edgeDragRef = useRef(null);
  const audioUrlRef = useRef('');
  const playbackStateRef = useRef({ playhead: 0, clips: [], voiceUrl: '', playing: false, timelineDuration: 1 });
  const fallbackClockRef = useRef({ startedAt: 0, startTime: 0 });
  const exportCanvasRef = useRef(null);
  const exportRecorderRef = useRef(null);
  const exportCancelledRef = useRef(false);
  const exportRafRef = useRef(0);
  const imageCacheRef = useRef({});
  const [exportingTimeline, setExportingTimeline] = useState(false);
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [projectName, setProjectName] = useState('Voiceover edit');
  const [activeProjectId, setActiveProjectId] = useState('');
  const [notice, setNotice] = useState('Import narration to build a synchronized multitrack edit.');
  const [snap, setSnap] = useState(true);
  const [pendingTrack, setPendingTrack] = useState('V1');
  const [trackStates, setTrackStates] = useState({});
  const clipboardRef = useRef(null);
  const [tracks, setTracks] = useState(TRACKS);
  const [activeTool, setActiveTool] = useState('select');
  const [editMode, setEditMode] = useState('overwrite');
  const [markers, setMarkers] = useState([]);
  const [timelineMaximized, setTimelineMaximized] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(() => Number(localStorage.getItem('vibepulse-autocut-timeline-height') || 58));
  useEffect(() => { localStorage.setItem('vibepulse-autocut-timeline-height', String(timelineHeight)); }, [timelineHeight]);
  const [trackHeights, setTrackHeights] = useState({});
  const clipHistoryRef = useRef({ past: [], future: [], current: null, signature: '', applying: false });
  const [, setClipHistoryVersion] = useState(0);
  const toggleTrackState = (trackId, key) => setTrackStates(old => ({ ...old, [trackId]: { ...(old[trackId] || {}), [key]: !(old[trackId]?.[key]) } }));
  const isTrackLocked = trackId => Boolean(trackStates[trackId]?.locked);
  const isTrackMuted = trackId => Boolean(trackStates[trackId]?.muted) || ((Boolean(trackStates.A1?.solo) || tracks.some(t => t.kind === 'audio' && trackStates[t.id]?.solo)) && !trackStates[trackId]?.solo);
  const isTrackHidden = trackId => Boolean(trackStates[trackId]?.hidden);
  const splitClipAt = (clip, at) => {
    if (!clip || isTrackLocked(clip.track)) return;
    const local = at - clip.start;
    if (local < 0.25 || local > clip.duration - 0.25) { setMessage('Place the Razor inside a clip, at least 0.25s from its edge.'); return; }
    const sourceBased = clip.type === 'video' || clip.type === 'audio';
    const left = { ...clip, duration: local, trimEnd: sourceBased ? (clip.trimStart || 0) + local : clip.trimEnd };
    const right = { ...clip, id: idOf(), start: at, duration: clip.duration - local, trimStart: sourceBased ? (clip.trimStart || 0) + local : clip.trimStart };
    setClips(old => old.flatMap(item => item.id === clip.id ? [left, right] : [item]));
    setSelectedId(right.id);
    setMessage('Clip split at ' + timecode(at) + '.');
  };
  const addMarker = () => { const marker = { id: idOf(), time: playhead, label: 'Marker ' + (markers.length + 1) }; setMarkers(old => [...old, marker].sort((a,b)=>a.time-b.time)); setMessage('Marker added at ' + timecode(playhead) + '.'); };
  const copySelectedClip = () => { if (!selectedClip) return; clipboardRef.current = { ...selectedClip }; setMessage('Copied '+selectedClip.name+'.'); };
  const pasteClip = () => { const source=clipboardRef.current; if(!source){setMessage('Copy a clip first.');return;} const item={...source,id:idOf(),start:snapTime(playhead),name:source.name+' copy'}; setClips(old=>[...old,item]);setSelectedId(item.id);setMessage('Pasted clip at '+timecode(item.start)+'.'); };
  const duplicateSelectedClip = () => { if(!selectedClip)return;const item={...selectedClip,id:idOf(),start:snapTime(selectedClip.start+selectedClip.duration),name:selectedClip.name+' copy'};setClips(old=>[...old,item]);setSelectedId(item.id);setSelectedIds([item.id]);setMessage('Clip duplicated.'); };
  const groupSelectedClips = () => { const ids=[...new Set([...selectedIds,selectedId])].filter(id=>id&&clips.some(c=>c.id===id)); if(ids.length<2){setMessage('Shift-click at least two clips to select them before grouping.');return;} const groupId=idOf();setClips(old=>old.map(c=>ids.includes(c.id)?{...c,groupId}:c));setSelectedIds(ids);setMessage(ids.length+' clips grouped.'); };
  const ungroupSelectedClip = () => { const clip=clips.find(c=>c.id===selectedId); if(!clip?.groupId){setMessage('Select a grouped clip first.');return;}const groupId=clip.groupId;setClips(old=>old.map(c=>c.groupId===groupId?({...c,groupId:undefined}):c));setSelectedIds([]);setMessage('Clip group separated.'); };
  const rippleDeleteSelected = () => { if(!selectedClip)return;if(isTrackLocked(selectedClip.track)){setMessage('This track is locked. Unlock it before deleting clips.');return;}const end=selectedClip.start+selectedClip.duration;const shift=selectedClip.duration;if(clips.some(c=>c.id!==selectedClip.id&&c.start>=end-0.001&&isTrackLocked(c.track))){setMessage('Ripple delete would move clips on a locked track. Unlock affected tracks first.');return;}setClips(old=>old.filter(c=>c.id!==selectedClip.id).map(c=>c.start>=end-0.001?{...c,start:Math.max(0,c.start-shift)}:c));setSelectedId('');setMessage('Ripple delete removed the clip and closed the gap across tracks.'); };
  const addGraphic = kind => { const text = kind === 'title' ? window.prompt('Title text', 'Your headline') : window.prompt('Map animation label', 'Location / route'); if (text === null || !text.trim()) return; const id = idOf(); const item = { id, name: kind === 'title' ? text.trim() : 'Map · ' + text.trim(), type: kind, kind: 'visual', track: kind === 'title' ? 'V4' : 'V5', start: snapTime(playhead), duration: 5, sourceDuration: 5, trimStart: 0, trimEnd: 5, text: text.trim(), animation: kind === 'title' ? 'fade' : 'route' }; setClips(old => [...old, item]); setSelectedId(id); setMessage((kind === 'title' ? 'Title' : 'Documentary map graphic') + ' added to ' + item.track + ' at ' + timecode(item.start) + '.'); };
  const setTrackHeight = (trackId, delta) => setTrackHeights(old => ({ ...old, [trackId]: clamp((old[trackId] || 70) + delta, 48, 180) }));
  const addTrack = kind => { const prefix = kind === 'visual' ? 'V' : 'A'; const number = Math.max(1, ...tracks.filter(t => t.kind === kind).map(t => Number(t.id.slice(1)) || 0)) + 1; const track = { id: prefix + number, label: prefix + number + (kind === 'visual' ? ' · Additional video/graphics' : ' · Additional audio'), kind }; setTracks(old => kind === 'visual' ? [track, ...old] : [...old, track]); setMessage('Added track ' + track.id + '.'); };
  const renameTrack = track => { const label = window.prompt('Rename track', track.label); if (label?.trim()) setTracks(old => old.map(t => t.id === track.id ? { ...t, label: label.trim() } : t)); };
  const [frameStep, setFrameStep] = useState(1);
  const [musicFile, setMusicFile] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [sfxFiles, setSfxFiles] = useState([]);
  const selectedClip = clips.find(c => c.id === selectedId) || null;
  useEffect(() => {
    const snapshot = clips.map(c => ({ ...c }));
    const signature = JSON.stringify(snapshot.map(({ url, ...c }) => c));
    const history = clipHistoryRef.current;
    if (history.applying) { history.applying = false; history.current = snapshot; history.signature = signature; setClipHistoryVersion(x => x + 1); return; }
    if (history.current && history.signature !== signature) { history.past.push(history.current); if (history.past.length > 80) history.past.shift(); history.future = []; }
    history.current = snapshot; history.signature = signature; setClipHistoryVersion(x => x + 1);
  }, [clips]);
  const undoClips = () => { const h = clipHistoryRef.current; if (!h.past.length) return; if (h.current) h.future.push(h.current); const previous = h.past.pop(); h.applying = true; h.current = previous; setClips(previous.map(c => ({ ...c }))); setMessage('Timeline edit undone.'); };
  const redoClips = () => { const h = clipHistoryRef.current; if (!h.future.length) return; if (h.current) h.past.push(h.current); const next = h.future.pop(); h.applying = true; h.current = next; setClips(next.map(c => ({ ...c }))); setMessage('Timeline edit redone.'); };
  const timelineDuration = Math.max(voiceDuration, clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0), 1);
  const visibleDuration = Math.max(5, timelineDuration);
  const pxPerSecond = 70 * waveformZoom;
  const pixelsWide = visibleDuration * pxPerSecond;
  playbackStateRef.current = { playhead, clips, voiceUrl, playing, timelineDuration };
  const visualTrackOrder = clip => Number(String(clip.track || '').slice(1)) || 0;
  const clipMotionAt = (clip, at) => {
    const base = { scale: Number(clip.scale || 1), x: Number(clip.x || 0), y: Number(clip.y || 0), opacity: Number(clip.opacity ?? 1) };
    const frames = [...(clip.keyframes || [])].sort((a,b)=>a.time-b.time);
    if (!frames.length) return base;
    const local = clamp(at - clip.start, 0, clip.duration);
    const before = [...frames].reverse().find(frame=>frame.time<=local);
    const after = frames.find(frame=>frame.time>=local);
    if (!before) return { scale: frames[0].scale, x: frames[0].x, y: frames[0].y, opacity: frames[0].opacity };
    if (!after || after.time===before.time) return { scale: before.scale, x: before.x, y: before.y, opacity: before.opacity };
    const p=clamp((local-before.time)/(after.time-before.time),0,1);
    return { scale: before.scale+(after.scale-before.scale)*p, x: before.x+(after.x-before.x)*p, y: before.y+(after.y-before.y)*p, opacity: before.opacity+(after.opacity-before.opacity)*p };
  };
  const clipTransitionAt = (clip, at) => { const duration=clamp(Number(clip.transitionDuration||0.5),0.1,3); const progress=clamp((at-clip.start)/duration,0,1); return { opacity: clip.transitionIn && clip.transitionIn!=='cut' ? progress : 1, slideX: clip.transitionIn==='slide' ? (1-progress)*12 : 0 }; };
  const addSelectedKeyframe = () => { if (!selectedClip || !['image','video'].includes(selectedClip.type)) return; const time=clamp(playhead-selectedClip.start,0,selectedClip.duration); const frame={time,scale:Number(selectedClip.scale||1),x:Number(selectedClip.x||0),y:Number(selectedClip.y||0),opacity:Number(selectedClip.opacity??1)}; setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,keyframes:[...(c.keyframes||[]).filter(k=>Math.abs(k.time-time)>0.01),frame].sort((a,b)=>a.time-b.time)}:c)); setMessage('Motion keyframe added at '+time.toFixed(2)+'s.'); };
  const renderExportFrame = () => {
    const canvas = exportCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const state = playbackStateRef.current; const at = state.playhead; const w = canvas.width; const h = canvas.height;
    ctx.fillStyle = '#05070a'; ctx.fillRect(0,0,w,h);
    const layers = state.clips.filter(c => c.kind === 'visual' && ['image','video'].includes(c.type) && !isTrackHidden(c.track) && at >= c.start && at < c.start + c.duration).sort((a,b)=>visualTrackOrder(a)-visualTrackOrder(b));
    const drawFit = (media, clip) => { const sw=media.videoWidth||media.naturalWidth||0, sh=media.videoHeight||media.naturalHeight||0; if(!sw||!sh)return; const fit=Math.min(w/sw,h/sh); const dw=sw*fit,dh=sh*fit; const motion=clipMotionAt(clip,at); const transition=clipTransitionAt(clip,at); ctx.save(); ctx.globalAlpha=clamp(motion.opacity*transition.opacity,0,1); ctx.translate(w/2+motion.x*w/100+transition.slideX*w/100,h/2+motion.y*h/100); ctx.scale(motion.scale,motion.scale); ctx.drawImage(media,-dw/2,-dh/2,dw,dh); ctx.restore(); };
    layers.forEach(layer => { if(layer.type==='image'){ let img=imageCacheRef.current[layer.url]; if(!img){img=new Image();img.src=layer.url;imageCacheRef.current[layer.url]=img;} if(img.complete)drawFit(img,layer); } else { const video=videoClipRefs.current[layer.id]; if(video&&video.readyState>=2)drawFit(video,layer); } });
    const titleClip=state.clips.filter(c=>c.type==='title'&&!isTrackHidden(c.track)&&at>=c.start&&at<c.start+c.duration).sort((a,b)=>visualTrackOrder(b)-visualTrackOrder(a))[0];
    const mapClip=state.clips.filter(c=>c.type==='map'&&!isTrackHidden(c.track)&&at>=c.start&&at<c.start+c.duration).sort((a,b)=>visualTrackOrder(b)-visualTrackOrder(a))[0];
    if(mapClip){ctx.fillStyle='rgba(5,20,28,.82)';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#3e777d';ctx.lineWidth=3;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(i*w/5,0);ctx.lineTo((i+1)*w/5,h);ctx.stroke();}ctx.strokeStyle='#fbbf24';ctx.lineWidth=8;ctx.setLineDash([16,12]);ctx.lineDashOffset=-((at-mapClip.start)/Math.max(.25,mapClip.duration))*w*.45;ctx.beginPath();ctx.moveTo(w*.18,h*.72);ctx.quadraticCurveTo(w*.45,h*.2,w*.8,h*.36);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f87171';[[.18,.72],[.8,.36]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(w*x,h*y,12,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#fff';ctx.font='bold 34px system-ui';ctx.fillText(mapClip.text||'Documentary route',48,56);}
    if(titleClip){const p=Math.min(1,Math.max(0,(at-titleClip.start)/.8));ctx.globalAlpha=titleClip.animation==='fade'?p:1;ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(w*.06,h*.76,w*.88,h*.15);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 42px system-ui';const slide=titleClip.animation==='slide'?(1-p)*40:0;const scale=titleClip.animation==='pop'?Math.max(.2,p):1;ctx.save();ctx.translate(w/2,h*.835+slide);ctx.scale(scale,scale);ctx.fillText(titleClip.text||titleClip.name,0,0,w*.82);ctx.restore();ctx.globalAlpha=1;ctx.textAlign='start';ctx.textBaseline='alphabetic';}
  };
  const exportTimeline = () => {
    if (!clips.length) { setMessage('Add media to the timeline before exporting.'); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { setMessage('This browser does not support timeline recording export. Use a current Chrome/Edge browser.'); return; }
    const canvas=document.createElement('canvas'); canvas.width=1280; canvas.height=720; exportCanvasRef.current=canvas; renderExportFrame();
    const stream=canvas.captureStream(30);
    const audioElements=[audioRef.current,...Object.values(audioTrackRefs.current)].filter(Boolean);
    audioElements.forEach(element=>{try{const audioStream=element.captureStream?.()||element.mozCaptureStream?.();audioStream?.getAudioTracks().forEach(track=>stream.addTrack(track));}catch{}});
    const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
    if(!mime){setMessage('This browser does not provide a supported WebM recording codec.');return;}
    const chunks=[]; const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000}); exportRecorderRef.current=recorder; exportCancelledRef.current=false;
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    recorder.onerror=()=>{setExportingTimeline(false);setPlaying(false);setMessage('Timeline export failed in the browser recorder.');};
    recorder.onstop=()=>{setExportingTimeline(false);setPlaying(false);stream.getTracks().forEach(track=>track.stop());if(exportCancelledRef.current){setMessage('Timeline export cancelled. No file was saved.');exportCancelledRef.current=false;return;}const blob=new Blob(chunks,{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(projectName||'vibepulse-timeline').replace(/[^a-z0-9-_]/gi,'-')+'.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage('Timeline export created as WebM ('+(blob.size/1024/1024).toFixed(1)+' MB). Check the downloaded video and audio before publishing.');};
    setPlayhead(0); if(audioRef.current)try{audioRef.current.currentTime=0;}catch{}; setExportingTimeline(true); setPlaying(true); recorder.start(250); setMessage('Recording timeline composition and audio to WebM…');
  };

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
    if (!exportingTimeline) return;
    const draw = () => { renderExportFrame(); exportRafRef.current = requestAnimationFrame(draw); };
    exportRafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(exportRafRef.current);
  }, [exportingTimeline]);

  useEffect(() => {
    if (exportingTimeline && playhead >= timelineDuration) { const recorder=exportRecorderRef.current; if(recorder && recorder.state==='recording') recorder.stop(); }
  }, [exportingTimeline, playhead, timelineDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    const currentState = () => playbackStateRef.current;
    const activeVideo = (at, clipsNow) => clipsNow.filter(c => c.kind === 'visual' && c.type === 'video' && !isTrackHidden(c.track) && at >= c.start && at < c.start + c.duration).sort((a,b)=>visualTrackOrder(b)-visualTrackOrder(a))[0];
    const tick = () => {
      const state = currentState();
      if (!state.playing) { cancelAnimationFrame(rafRef.current); return; }
      let now = state.playhead;
      if (state.voiceUrl && audio && !audio.paused && !audio.ended) {
        now = audio.currentTime || 0;
      } else {
        const videoClip = activeVideo(state.playhead, state.clips);
        const video = videoRef.current;
        if (videoClip && video && !video.paused && Number.isFinite(video.currentTime)) {
          now = videoClip.start + video.currentTime - Number(videoClip.trimStart || 0);
        } else {
          const audioClip = state.clips.filter(c => c.kind === 'audio' && !isTrackMuted(c.track) && state.playhead >= c.start && state.playhead < c.start + c.duration).find(c => {
            const element = audioTrackRefs.current[c.id];
            return element && !element.paused && !element.ended;
          });
          const element = audioClip ? audioTrackRefs.current[audioClip.id] : null;
          if (audioClip && element) now = audioClip.start + element.currentTime - Number(audioClip.trimStart || 0);
          else now = fallbackClockRef.current.startTime + (performance.now() - fallbackClockRef.current.startedAt) / 1000;
        }
      }
      if (now >= state.timelineDuration) {
        setPlayhead(state.timelineDuration);
        setPlaying(false);
        cancelAnimationFrame(rafRef.current);
        return;
      }
      setPlayhead(Math.max(0, now));
      rafRef.current = requestAnimationFrame(tick);
    };
    if (playing) {
      fallbackClockRef.current = { startedAt: performance.now(), startTime: playhead };
      if (voiceUrl && audio) {
        if (Math.abs(audio.currentTime - playhead) > 0.2 && playhead < (audio.duration || Infinity)) { try { audio.currentTime = playhead; } catch {} }
        audio.play().catch(() => { setNotice('Browser blocked narration playback. Press Play again to allow it.'); });
      } else {
        const videoClip = activeVideo(playhead, clips);
        if (videoClip && videoRef.current) {
          try { videoRef.current.currentTime = Number(videoClip.trimStart || 0) + Math.max(0, playhead - videoClip.start); } catch {}
          videoRef.current.play().catch(() => {});
        } else {
          const audioClip = clips.filter(c => c.kind === 'audio' && !isTrackMuted(c.track) && playhead >= c.start && playhead < c.start + c.duration)[0];
          const element = audioClip ? audioTrackRefs.current[audioClip.id] : null;
          if (element) { try { element.currentTime = Number(audioClip.trimStart || 0) + playhead - audioClip.start; } catch {} element.play().catch(() => {}); }
        }
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (audio) audio.pause();
      if (videoRef.current) videoRef.current.pause();
      Object.values(audioTrackRefs.current).forEach(element => element?.pause());
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, voiceUrl]);

  useEffect(() => {
    const movePan = event => { if (!panRef.current || !rulerRef.current) return; rulerRef.current.scrollLeft = panRef.current.scrollLeft - (event.clientX - panRef.current.pointerX); };
    const moveSlip = event => { const slip=slipRef.current; if(!slip)return; const delta=(event.clientX-slip.pointerX)/pxPerSecond; const trimStart=clamp(slip.trimStart+delta,0,Math.max(0,slip.sourceDuration-slip.duration)); setClips(old=>old.map(c=>c.id===slip.id?{...c,trimStart,trimEnd:trimStart+slip.duration,duration:slip.duration}:c)); };
    const endPan = () => { panRef.current = null; };
    window.addEventListener('pointermove', movePan);
    window.addEventListener('pointermove', moveSlip);
    window.addEventListener('pointerup', endPan);
    window.addEventListener('pointercancel', endPan);
    return () => { window.removeEventListener('pointermove', movePan); window.removeEventListener('pointermove', moveSlip); window.removeEventListener('pointerup', endPan); window.removeEventListener('pointercancel', endPan); };
  }, []);

  useEffect(() => {
    const moveEdge = (event) => {
      const drag = edgeDragRef.current;
      if (!drag) return;
      const delta = (event.clientX - drag.pointerX) / pxPerSecond;
      const nextStart = drag.edge === 'left' ? clamp(drag.start + delta, 0, drag.start + drag.duration - 0.25) : drag.start;
      const nextDuration = drag.edge === 'left' ? drag.duration - (nextStart - drag.start) : clamp(drag.duration + delta, 0.25, Math.max(0.25, (drag.sourceDuration || drag.duration) - drag.trimStart));
      const rippleTotal = nextDuration - drag.duration;
      const rippleDelta = rippleTotal - Number(drag.lastRippleTotal || 0);
      drag.lastRippleTotal = rippleTotal;
      setClips(old => old.map(c => {
        if (c.id !== drag.id) { if (drag.tool === 'ripple' && c.track === drag.track && c.start >= drag.start + drag.duration - 0.001) return { ...c, start: Math.max(0, c.start + rippleDelta) }; return c; }
        const sourceBased = c.type === 'video' || c.type === 'audio';
        if (drag.edge === 'left') {
          const shift = nextStart - drag.start;
          return { ...c, start: nextStart, duration: nextDuration, trimStart: sourceBased ? Math.max(0, drag.trimStart + shift) : drag.trimStart };
        }
        return { ...c, duration: nextDuration, trimEnd: sourceBased ? drag.trimStart + nextDuration : c.trimEnd };
      }));
    };
    const endEdge = () => { edgeDragRef.current = null; };
    window.addEventListener('pointermove', moveEdge);
    window.addEventListener('pointerup', endEdge);
    window.addEventListener('pointercancel', endEdge);
    return () => {
      window.removeEventListener('pointermove', moveEdge);
      window.removeEventListener('pointerup', endEdge);
      window.removeEventListener('pointercancel', endEdge);
    };
  }, [pxPerSecond]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelectedClip(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteClip(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelectedClip(); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'v') { setActiveTool('select'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'c') { setActiveTool('razor'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'h') { setActiveTool('hand'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'a') { setActiveTool('track-select'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'b') { setActiveTool('ripple'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'y') { setActiveTool('slip'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'z') { setActiveTool('zoom'); return; }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'm') { addMarker(); return; }
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying(value => !value);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        const target = clips.find(c => c.id === selectedId);
        if (target && isTrackLocked(target.track)) { setMessage('This track is locked. Unlock it before deleting clips.'); return; }
        setClips(old => old.filter(c => c.id !== selectedId));
        setSelectedId('');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekTo(Math.max(0, playhead - (event.shiftKey ? 1 : 1 / 30)));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekTo(playhead + (event.shiftKey ? 1 : 1 / 30));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, playhead, voiceUrl, clips, projectName, activeProjectId, thresholdDb, minSilence, waveform, playing, activeTool, markers]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isTrackMuted('A1');
    const activeVideos = clips.filter(c => c.kind === 'visual' && c.type === 'video' && !isTrackHidden(c.track) && playhead >= c.start && playhead < c.start + c.duration);
    activeVideos.forEach(target => {
      const element = videoClipRefs.current[target.id];
      if (!element) return;
      const clipTime = clamp(Number(target.trimStart || 0) + (playhead - target.start), Number(target.trimStart || 0), Number(target.trimStart || 0) + target.duration);
      if (Number.isFinite(clipTime) && Math.abs(element.currentTime - clipTime) > 0.2 && !element.seeking) { try { element.currentTime = clipTime; } catch {} }
      if (playing) element.play().catch(() => {}); else element.pause();
    });
    Object.entries(videoClipRefs.current).forEach(([id, element]) => { if (element && !activeVideos.some(c => c.id === id)) element.pause(); });
    clips.filter(c => c.kind === 'audio' && c.track !== 'A1').forEach(c => {
      const el = audioTrackRefs.current[c.id];
      if (!el) return;
      el.muted = isTrackMuted(c.track);
      const elapsed = Math.max(0, playhead - c.start);
      const baseVolume = clamp(Number(c.volume ?? 1), 0, 1);
      const fadeIn = Math.max(0, Number(c.fadeIn || 0));
      const fadeOut = Math.max(0, Number(c.fadeOut || 0));
      let envelope = 1;
      if (fadeIn > 0) envelope = Math.min(envelope, elapsed / fadeIn);
      if (fadeOut > 0) envelope = Math.min(envelope, (c.duration - elapsed) / fadeOut);
      el.volume = clamp(baseVolume * envelope, 0, 1);
      if (isTrackMuted(c.track)) { el.pause(); return; }
      const local = playhead - c.start + c.trimStart;
      if (playing && playhead >= c.start && playhead < c.start + c.duration) {
        if (Math.abs(el.currentTime - local) > 0.25 && !el.seeking) { try { el.currentTime = local; } catch {} }
        el.play().catch(() => {});
      } else { el.pause(); }
    });
  }, [playhead, clips, playing, trackStates]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    mediaUrlRef.current.forEach(url => URL.revokeObjectURL(url));
    if (musicUrl) URL.revokeObjectURL(musicUrl);
  }, []);

  const activeVisual = useCallback((at) => {
    return clips.filter(c => c.kind === 'visual' && ['image','video'].includes(c.type) && !isTrackHidden(c.track) && at >= c.start && at < c.start + c.duration)
      .sort((a, b) => (Number(b.track.slice(1)) || 0) - (Number(a.track.slice(1)) || 0))[0] || null;
  }, [clips, trackStates]);

  const updateVideoAt = (at) => {
    clips.filter(c => c.kind === 'visual' && !isTrackHidden(c.track) && c.type === 'video' && at >= c.start && at < c.start + c.duration).forEach(target => {
      const element = videoClipRefs.current[target.id];
      if (!element || element.seeking) return;
      const wanted = clamp(Number(target.trimStart || 0) + (at - target.start), Number(target.trimStart || 0), Number(target.trimStart || 0) + target.duration);
      if (Math.abs(element.currentTime - wanted) > 0.18) { try { element.currentTime = wanted; } catch {} }
    });
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
    if (isTrackLocked('A1')) { setMessage('A1 is locked. Unlock the voiceover track before replacing narration.'); return; }
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
    setClips(old => { let next=old.filter(c=>!(editMode==='overwrite'&&c.track===track&&c.start<startAt+duration&&c.start+c.duration>startAt)); if(editMode==='insert') next=next.map(c=>c.track===track&&c.start>=startAt?{...c,start:c.start+duration}:c); return [...next,item]; });
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
    setClips(old => { let next=old.filter(c=>!(editMode==='overwrite'&&c.track===track&&c.start<playhead+duration&&c.start+c.duration>playhead)); if(editMode==='insert') next=next.map(c=>c.track===track&&c.start>=playhead?{...c,start:c.start+duration}:c); return [...next,item]; });
    if (track === 'A2') { setMusicFile(file); setMusicUrl(url); }
    else setSfxFiles(old => [...old, item]);
    setMessage('Added ' + file.name + ' to ' + track + '.');
  };

  const onDropTrack = (event, track) => {
    event.preventDefault();
    const rect = rulerRef.current?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
    const labelOffset = 144;
    const start = Math.max(0, (event.clientX - rect.left + (rulerRef.current?.scrollLeft || 0) - labelOffset) / pxPerSecond);
    if (isTrackLocked(track)) { setMessage('This track is locked. Unlock it before editing.'); return; }
    const sourceId = event.dataTransfer.getData('application/x-vibepulse-media');
    const clipId = event.dataTransfer.getData('application/x-vibepulse-timeline-clip');
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) return importTrackAudio(file, track);
    if (clipId) {
      const moving = clips.find(c => c.id === clipId);
      const startAt = snapTime(start, clipId);
      if (!moving) return;
      if (moving.groupId) { const group=clips.filter(c=>c.groupId===moving.groupId); if(isTrackLocked(track)||group.some(c=>isTrackLocked(c.track))){setMessage('Group contains a locked track. Unlock affected tracks before moving it.');return;} const delta=startAt-moving.start; setClips(old=>old.map(c=>c.groupId===moving.groupId?{...c,start:Math.max(0,c.start+delta),...(c.id===clipId?{track}:{})}:c)); return; }
      setClips(old => { let next = old.filter(c => !(editMode === 'overwrite' && c.id !== clipId && c.track === track && c.start < startAt + moving.duration && c.start + c.duration > startAt)); if (editMode === 'insert') next = next.map(c => c.id !== clipId && c.track === track && c.start >= startAt ? { ...c, start: c.start + moving.duration } : c); return next.map(c => c.id === clipId ? { ...c, start: startAt, track } : c); });
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
      const record = { id: activeProjectId || idOf(), name: projectName, voiceFile, clips: clips.map(({ url, ...c }) => c), thresholdDb, minSilence, waveform, updatedAt: new Date().toISOString(), playhead, tracks, trackStates, trackHeights, markers };
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
      const restored = (project.clips || []).map(c => ({ ...c, url: c.file ? URL.createObjectURL(c.file) : '' }));
      restored.forEach(c => { if (c.url) mediaUrlRef.current.push(c.url); });
      setClips(restored);
      setTracks(project.tracks || TRACKS);
      setTrackStates(project.trackStates || {});
      setTrackHeights(project.trackHeights || {});
      setMarkers(project.markers || []);
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

  const visualLayersForPreview = clips.filter(c => c.kind === 'visual' && ['image','video'].includes(c.type) && !isTrackHidden(c.track) && playhead >= c.start && playhead < c.start + c.duration).sort((a,b)=>(Number(a.track.slice(1))||0)-(Number(b.track.slice(1))||0));
  const visualForPreview = visualLayersForPreview[visualLayersForPreview.length - 1] || null;
  const activeVideoForPreview = [...visualLayersForPreview].reverse().find(c => c.type === 'video') || null;
  const activeTitle = clips.filter(c => c.type === 'title' && !isTrackHidden(c.track) && playhead >= c.start && playhead < c.start + c.duration).sort((a,b)=>(Number(b.track.slice(1))||0)-(Number(a.track.slice(1))||0)).at(0);
  const activeMap = clips.filter(c => c.type === 'map' && !isTrackHidden(c.track) && playhead >= c.start && playhead < c.start + c.duration).sort((a,b)=>(Number(b.track.slice(1))||0)-(Number(a.track.slice(1))||0)).at(0);
  const trackColor = (track) => track === 'V1' ? 'border-violet-400/60 bg-violet-500/25' : track === 'V2' ? 'border-sky-400/60 bg-sky-500/20' : track === 'V3' ? 'border-amber-400/60 bg-amber-500/20' : track === 'V4' ? 'border-pink-400/60 bg-pink-500/20' : 'border-emerald-400/60 bg-emerald-500/20';

  return <section className={"mt-2 flex min-h-[420px] flex-col overflow-hidden border border-[#454545] bg-[#242424] p-0 font-sans text-[#d4d4d4] shadow-2xl " + (timelineMaximized ? "fixed inset-2 z-[100]" : "")} style={{height: timelineMaximized ? "auto" : timelineHeight + "vh", maxHeight: timelineMaximized ? "none" : timelineHeight + "vh"}}>
    <div role="separator" aria-label="Resize timeline height" title="Drag to resize timeline height" onPointerDown={e=>{e.preventDefault();const move=ev=>setTimelineHeight(Math.min(85,Math.max(30,((window.innerHeight-ev.clientY)/window.innerHeight)*100)));const up=()=>window.removeEventListener("pointermove",move);window.addEventListener("pointermove",move);window.addEventListener("pointerup",up,{once:true});}} className="h-1.5 shrink-0 cursor-row-resize bg-[#3a3a3a] hover:bg-sky-400/70"/>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#454545] bg-[#303030] px-4 py-3">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#eeeeee]"><AudioLines size={17} className="text-[#83b9ef]" /> AutoCut · Timeline</h2><p className="mt-1 text-[11px] text-[#a9a9a9]">Sequence · synchronized narration · multitrack editing</p></div>
      <div className="flex flex-wrap gap-1"><button onClick={() => addTrack("visual")} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px]">+ Video track</button><button onClick={() => addTrack("audio")} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px]">+ Audio track</button><button onClick={saveProject} className="inline-flex items-center gap-1 border border-[#555] bg-[#383838] px-3 py-1.5 text-[11px] hover:bg-[#484848]"><Save size={14}/> Save timeline</button><button onClick={exportTimeline} disabled={exportingTimeline||!clips.length} className="inline-flex items-center gap-1 border border-emerald-700 bg-emerald-900/70 px-3 py-1.5 text-[11px] text-emerald-100 disabled:opacity-40"><Download size={13}/>{exportingTimeline?"Exporting…":"Export WebM"}</button>{exportingTimeline&&<button onClick={()=>{exportCancelledRef.current=true;exportRecorderRef.current?.stop();}} className="border border-rose-800 bg-rose-950/70 px-2 py-1.5 text-[11px] text-rose-100">Cancel</button>}<select aria-label="Open saved timeline" value="" onChange={e => { if (e.target.value) loadProject(e.target.value); }} className="border border-[#555] bg-[#1f1f1f] px-2 py-1.5 text-[11px] text-[#ddd]"><option value="">Open saved…</option>{savedProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.clipCount})</option>)}</select></div>
    </div>
    <div className="grid gap-px border-b border-[#454545] bg-[#454545] md:grid-cols-[1fr_1fr]">
      <label className="bg-[#2d2d2d] p-3 text-[11px] text-[#bcbcbc]">Project name<input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-1 w-full border border-[#555] bg-[#1d1d1d] px-2 py-1.5 text-sm text-[#eee]" /></label>
      <label className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">Import voiceover / narration<input type="file" accept="audio/*" onChange={e => { importVoice(e.target.files?.[0]); e.target.value = ''; }} className="mt-2 block w-full text-[11px] text-[#bbb]" /></label>
    </div>
    <audio ref={audioRef} src={voiceUrl || undefined} preload="auto" onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration) && !waveform) setVoiceDuration(e.currentTarget.duration); }} onEnded={() => { if (timelineDuration > voiceDuration + 0.1) { fallbackClockRef.current = { startedAt: performance.now(), startTime: voiceDuration }; } else { setPlaying(false); setPlayhead(timelineDuration); } }} />
    <div className="flex flex-wrap items-center gap-1 border-b border-[#454545] bg-[#292929] px-2 py-1.5"><button type="button" onClick={undoClips} disabled={!clipHistoryRef.current.past.length} title="Undo timeline edit" className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] disabled:opacity-30">↶ Undo</button><button type="button" onClick={redoClips} disabled={!clipHistoryRef.current.future.length} title="Redo timeline edit" className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] disabled:opacity-30">↷ Redo</button>
      <button type="button" title="Copy selected clip (Ctrl+C)" onClick={copySelectedClip} disabled={!selectedClip} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] disabled:opacity-30">Copy</button><button type="button" title="Paste clip at playhead (Ctrl+V)" onClick={pasteClip} disabled={!clipboardRef.current} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] disabled:opacity-30">Paste</button><button type="button" title="Group selected clips" onClick={groupSelectedClips} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px]">Group</button><button type="button" title="Ungroup selected clip" onClick={ungroupSelectedClip} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px]">Ungroup</button><button type="button" title="Duplicate selected clip (Ctrl+D)" onClick={duplicateSelectedClip} disabled={!selectedClip} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] disabled:opacity-30">Duplicate</button><button type="button" title="Ripple delete selected clip" onClick={rippleDeleteSelected} disabled={!selectedClip} className="border border-rose-900 bg-rose-950/50 px-2 py-1 text-[10px] text-rose-100 disabled:opacity-30">Ripple delete</button><button type="button" title="Selection tool (V)" onClick={()=>setActiveTool("select")} className={"border px-2 py-1 text-[10px] "+(activeTool==="select"?"border-sky-400 bg-sky-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}>V · Select</button>
      <button type="button" title="Slip (Y): move source content inside a clip without changing timeline duration" onClick={()=>setActiveTool("slip")} className={"border px-2 py-1 text-[10px] "+(activeTool==="slip"?"border-cyan-400 bg-cyan-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}>Y · Slip</button><button type="button" title="Ripple Edit (B): trim and shift later clips on this track" onClick={()=>setActiveTool("ripple")} className={"border px-2 py-1 text-[10px] "+(activeTool==="ripple"?"border-amber-400 bg-amber-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}>B · Ripple</button><button type="button" title="Track Select (A): select clips from this point forward on the same track" onClick={()=>setActiveTool("track-select")} className={"border px-2 py-1 text-[10px] "+(activeTool==="track-select"?"border-emerald-400 bg-emerald-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}>A · Track Select</button><button type="button" title="Hand tool (H): drag to pan timeline" onClick={()=>setActiveTool("hand")} className={"border px-2 py-1 text-[10px] "+(activeTool==="hand"?"border-amber-400 bg-amber-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}><Hand size={11} className="mr-1 inline"/>H · Hand</button><button type="button" title="Zoom tool: click to zoom in, Shift-click to zoom out" onClick={()=>setActiveTool("zoom")} className={"border px-2 py-1 text-[10px] "+(activeTool==="zoom"?"border-violet-400 bg-violet-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}>Z · Zoom</button><button type="button" title="Razor tool (C): click a clip to split" onClick={()=>setActiveTool("razor")} className={"border px-2 py-1 text-[10px] "+(activeTool==="razor"?"border-rose-400 bg-rose-900/60 text-white":"border-[#555] bg-[#383838] text-slate-300")}>C · Razor</button>
      <button type="button" title="Add editable title on V4" onClick={()=>addGraphic("title")} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] text-slate-300">T · Title</button><button type="button" title="Add editable documentary map graphic on V5" onClick={()=>addGraphic("map")} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] text-slate-300">Map · Graphic</button><button type="button" title="Insert edit shifts later clips; overwrite replaces overlaps" onClick={()=>setEditMode(x=>x==="insert"?"overwrite":"insert")} className={"border px-2 py-1 text-[10px] "+(editMode==="insert"?"border-amber-500 bg-amber-950 text-amber-100":"border-[#555] bg-[#383838] text-slate-300")}>{editMode==="insert"?"Insert Edit":"Overwrite Edit"}</button><button type="button" title="Add marker at playhead (M)" onClick={addMarker} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] text-slate-300">M · Marker</button>
      <button type="button" onClick={()=>setSnap(x=>!x)} className={"border px-2 py-1 text-[10px] "+(snap?"border-emerald-500 bg-emerald-950 text-emerald-200":"border-[#555] bg-[#383838] text-slate-300")}>Snap {snap?"On":"Off"}</button>
      <button onClick={() => setPlaying(true)} disabled={!voiceUrl} className="inline-flex items-center gap-1 border border-[#3977a8] bg-[#24669a] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2d79b4] disabled:opacity-40"><Play size={14}/> Play</button>
      <button onClick={() => setPlaying(false)} className="inline-flex items-center gap-1 border border-[#555] bg-[#383838] px-3 py-1.5 text-[11px] hover:bg-[#484848]"><Pause size={14}/> Pause</button>
      <button onClick={stop} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs"><Square size={13}/> Stop</button>
      <button onClick={() => stepFrame(-1)} className="border border-[#555] bg-[#383838] px-2 py-1.5 hover:bg-[#484848]" title="Previous frame (30 fps)"><SkipBack size={14}/></button>
      <button onClick={() => stepFrame(1)} className="border border-[#555] bg-[#383838] px-2 py-1.5 hover:bg-[#484848]" title="Next frame (30 fps)"><SkipForward size={14}/></button>
      <span className="border border-[#454545] bg-[#1d1d1d] px-2 py-1 font-mono text-[11px] text-[#9fd2ff]">{timecode(playhead)} / {timecode(timelineDuration)}</span>
      <button onClick={() => setWaveformZoom(v => clamp(v / 1.25, 0.25, 8))} className="ml-auto border border-[#555] bg-[#383838] px-2 py-1.5 hover:bg-[#484848]" title="Zoom out"><ZoomOut size={14}/></button>
      <button onClick={() => setTimelineMaximized(x=>!x)} className="border border-[#555] bg-[#383838] px-2 py-1.5 text-[10px] hover:bg-[#484848]" title="Maximize/restore timeline">{timelineMaximized?"Restore timeline":"Maximize timeline"}</button><button onClick={() => setWaveformZoom(v => clamp(v * 1.25, 0.25, 8))} className="rounded-lg border border-white/10 px-2 py-2" title="Zoom in"><ZoomIn size={14}/></button>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-b border-[#454545] bg-[#2d2d2d] px-3 py-2 text-[11px] text-[#bcbcbc]">
      <label>Silence threshold: {thresholdDb} dBFS<input type="range" min="-60" max="-24" step="1" value={thresholdDb} onChange={e => { const value = Number(e.target.value); setThresholdDb(value); if (voiceFile) analyzeVoice(voiceFile, value, minSilence); }} className="ml-2 w-32 align-middle" /></label>
      <label>Minimum silence: {minSilence.toFixed(2)}s<input type="range" min="0.25" max="2.5" step="0.05" value={minSilence} onChange={e => { const value = Number(e.target.value); setMinSilence(value); if (voiceFile) analyzeVoice(voiceFile, thresholdDb, value); }} className="ml-2 w-32 align-middle" /></label>
      <span className="text-amber-200">{waveform?.silences?.length || 0} silence regions</span>
    </div>
    <div ref={rulerRef} onPointerDown={e=>{if(activeTool==="hand"){e.preventDefault();panRef.current={pointerX:e.clientX,scrollLeft:e.currentTarget.scrollLeft};}}} className={"min-h-0 flex-1 overflow-auto border-y border-[#454545] bg-[#1b1b1b] "+(activeTool==="hand"?"cursor-grab":"")} onClick={e => { if (e.target !== rulerRef.current) return; seekFromPointer(e); }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const rect = rulerRef.current.getBoundingClientRect(); const t = Math.max(0, (e.clientX - rect.left + rulerRef.current.scrollLeft - 144) / pxPerSecond); onDropTrack(e, pendingTrack || 'V1'); seekTo(t); }}>
      <div className="relative" style={{ width: Math.max(900, pixelsWide), minWidth: '100%' }}>
        <div className="sticky top-0 z-10 flex h-8 border-b border-[#454545] bg-[#292929]">
          {Array.from({ length: Math.ceil(visibleDuration / 5) + 1 }, (_, i) => <div key={i} style={{ left: i * 5 * pxPerSecond, position: 'absolute' }} className="border-l border-[#444] pl-1 text-[10px] text-[#aaa]">{timecode(i * 5)}</div>)}
        </div>
        <div className="relative flex min-h-[104px] border-b border-[#454545] bg-[#252525]">
          <div className="absolute left-0 top-0 z-10 flex h-full w-36 flex-col justify-center border-r border-[#454545] bg-[#303030] px-1.5 py-2 text-[11px] font-semibold text-[#8fc7f4]"><span>A1 · Voiceover</span><span className="mt-1 text-[9px] font-normal text-slate-400">{waveform ? (waveform.silences?.length || 0) + ' pauses detected' : 'Import voice to analyze'}</span><div className="mt-1 flex items-center gap-1"><button type="button" title={isTrackMuted("A1")?"Unmute voiceover":"Mute voiceover"} onClick={()=>toggleTrackState("A1","muted")} className="rounded px-1 text-slate-300 hover:bg-white/10">{isTrackMuted("A1")?<VolumeX size={11}/>:<Volume2 size={11}/>}</button><button type="button" title={trackStates.A1?.solo?"Disable voiceover solo":"Solo voiceover"} onClick={()=>toggleTrackState("A1","solo")} className={"rounded px-1 text-[9px] "+(trackStates.A1?.solo?"bg-amber-500 text-black":"text-slate-300 hover:bg-white/10")}>S</button><button type="button" title={isTrackLocked("A1")?"Unlock voiceover":"Lock voiceover"} onClick={()=>toggleTrackState("A1","locked")} className="rounded px-1 text-slate-300 hover:bg-white/10">{isTrackLocked("A1")?<Lock size={11}/>:<Unlock size={11}/>}</button></div></div>
          <div className="ml-36 min-h-[104px] cursor-crosshair" style={{ width: Math.max(0, pixelsWide - 144) }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left + rulerRef.current.scrollLeft) / pxPerSecond); }}>
            <div className="relative min-h-[104px]">{renderWave()}</div>
          </div>
        </div>
        {tracks.map(track => <div key={track.id} className="relative border-b border-[#383838] bg-[linear-gradient(to_right,rgba(170,170,170,0.10)_1px,transparent_1px)]" style={{ height: (trackHeights[track.id] || 70) + 'px', backgroundSize: (pxPerSecond * 5) + 'px 100%' }} onDragOver={e => e.preventDefault()} onDrop={e => onDropTrack(e, track.id)} onClick={e => { if(activeTool==="zoom"){setWaveformZoom(value=>clamp(value*(e.shiftKey?0.8:1.25),0.25,8));return;} if(activeTool==="hand")return; if (!e.target.closest('[data-clip]')) { const rect = rulerRef.current.getBoundingClientRect(); seekTo(Math.max(0, (e.clientX - rect.left + rulerRef.current.scrollLeft - 144) / pxPerSecond)); setPendingTrack(track.id); } }}>
          <div className="absolute left-0 top-0 z-10 flex h-full w-36 flex-col justify-center border-r border-[#454545] bg-[#303030] px-1.5"><button type="button" title="Rename track" onClick={e=>{e.stopPropagation();renameTrack(track);}} className="block max-w-full truncate text-left text-[10px] font-semibold text-[#c5c5c5] hover:text-white">{track.label} ✎</button><div className="mt-1 flex items-center gap-1"><button type="button" title="Decrease track height" onClick={e=>{e.stopPropagation();setTrackHeight(track.id,-10);}} className="px-0.5 text-[9px] text-slate-400 hover:text-white">−</button><button type="button" title="Increase track height" onClick={e=>{e.stopPropagation();setTrackHeight(track.id,10);}} className="px-0.5 text-[9px] text-slate-400 hover:text-white">+</button>{track.kind === "visual" && <button type="button" title={isTrackHidden(track.id) ? "Show track" : "Hide track"} onClick={e => { e.stopPropagation(); toggleTrackState(track.id, "hidden"); }} className="rounded px-1 text-slate-300 hover:bg-white/10">{isTrackHidden(track.id) ? <EyeOff size={11}/> : <Eye size={11}/>}</button>}{track.kind === "audio" && <><button type="button" title={isTrackMuted(track.id) ? "Unmute track" : "Mute track"} onClick={e => { e.stopPropagation(); toggleTrackState(track.id, "muted"); }} className="rounded px-1 text-slate-300 hover:bg-white/10">{isTrackMuted(track.id) ? <VolumeX size={11}/> : <Volume2 size={11}/>}</button><button type="button" title={trackStates[track.id]?.solo ? "Disable solo" : "Solo this track"} onClick={e=>{e.stopPropagation();toggleTrackState(track.id,"solo");}} className={"rounded px-1 text-[9px] "+(trackStates[track.id]?.solo?"bg-amber-500 text-black":"text-slate-300 hover:bg-white/10")}>S</button></>}<button type="button" title={isTrackLocked(track.id) ? "Unlock track" : "Lock track"} onClick={e => { e.stopPropagation(); toggleTrackState(track.id, "locked"); }} className="rounded px-1 text-slate-300 hover:bg-white/10">{isTrackLocked(track.id) ? <Lock size={11}/> : <Unlock size={11}/>}</button>{isTrackLocked(track.id) && <span className="text-[9px] text-amber-300">LOCKED</span>}</div></div>
          <div className="relative ml-36 min-h-[62px]" style={{ width: Math.max(0, pixelsWide - 144) }}>
            {track.id === 'A2' && <label className="absolute left-2 top-2 z-10 cursor-pointer rounded bg-emerald-900/80 px-2 py-1 text-[10px] text-emerald-100"><Music2 size={10} className="mr-1 inline"/>Add music<input type="file" accept="audio/*" hidden onChange={e => { importTrackAudio(e.target.files?.[0], 'A2'); e.target.value = ''; }}/></label>}
            {track.id === 'A3' && <label className="absolute left-2 top-2 z-10 cursor-pointer rounded bg-emerald-900/80 px-2 py-1 text-[10px] text-emerald-100">Add SFX<input type="file" accept="audio/*" hidden onChange={e => { importTrackAudio(e.target.files?.[0], 'A3'); e.target.value = ''; }}/></label>}
            {clips.filter(c => c.track === track.id).map(c => <div key={c.id} data-clip="true" draggable={activeTool==="select"} onDragStart={e => { if (isTrackLocked(c.track)) { e.preventDefault(); setMessage('This track is locked. Unlock it before moving clips.'); return; } dragRef.current = c.id; e.dataTransfer.setData('application/x-vibepulse-timeline-clip', c.id); }} onPointerDown={e=>{if(activeTool!=="slip"||!["video","audio"].includes(c.type)||isTrackLocked(c.track))return;e.preventDefault();e.stopPropagation();slipRef.current={id:c.id,pointerX:e.clientX,trimStart:Number(c.trimStart||0),duration:c.duration,sourceDuration:Number(c.sourceDuration||c.duration)};setSelectedId(c.id);}} onClick={e => { e.stopPropagation(); const bounds=e.currentTarget.getBoundingClientRect(); const clickedAt=c.start+clamp((e.clientX-bounds.left)/Math.max(1,bounds.width),0,1)*c.duration; if(activeTool==="razor"){splitClipAt(c,clickedAt);return;} if(activeTool==="hand")return; if(activeTool==="zoom"){setWaveformZoom(value=>clamp(value*(e.shiftKey?0.8:1.25),0.25,8));return;} if(activeTool==="track-select"){const ids=clips.filter(item=>item.track===c.track&&item.start>=clickedAt).map(item=>item.id);setSelectedIds(ids);setSelectedId(c.id);seekTo(clickedAt);return;} if(e.shiftKey){setSelectedIds(old=>old.includes(c.id)?old.filter(id=>id!==c.id):[...old,c.id]);setSelectedId(c.id);seekTo(c.start);return;} setSelectedId(c.id);setSelectedIds([c.id]); seekTo(c.start); }} className={'absolute top-1 h-14 overflow-hidden rounded-sm border px-2 py-1 text-[10px] shadow-sm ' + (track.id.startsWith('V') ? 'border-[#4f8fca] bg-[#315f8a] text-[#e4f1ff]' : 'border-[#239b70] bg-[#167b59] text-[#e3fff4]') + ((selectedId === c.id || selectedIds.includes(c.id)) ? ' ring-2 ring-white' : '')} style={{ left: c.start * pxPerSecond, width: Math.max(34, c.duration * pxPerSecond) }} title={c.name + ' · ' + c.duration.toFixed(2) + 's'}><span role="button" tabIndex={0} title="Trim clip start" onClick={e => e.stopPropagation()} onPointerDown={e => { e.preventDefault(); e.stopPropagation(); if (!['select','ripple'].includes(activeTool) || isTrackLocked(c.track)) return; if(activeTool==='ripple'&&clips.some(item=>item.id!==c.id&&item.track===c.track&&item.start>=c.start+c.duration-0.001&&isTrackLocked(item.track))){setMessage('Ripple trim would move clips on a locked track. Unlock the track first.');return;} edgeDragRef.current = { id: c.id, edge: 'left', pointerX: e.clientX, start: c.start, duration: c.duration, trimStart: c.trimStart || 0, sourceDuration: c.sourceDuration || c.duration, track:c.track, tool:activeTool, lastRippleTotal:0 }; setSelectedId(c.id); }} className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize bg-white/25 hover:bg-white/70" /><span role="button" tabIndex={0} title="Trim clip end" onClick={e => e.stopPropagation()} onPointerDown={e => { e.preventDefault(); e.stopPropagation(); if (!['select','ripple'].includes(activeTool) || isTrackLocked(c.track)) return; if(activeTool==='ripple'&&clips.some(item=>item.id!==c.id&&item.track===c.track&&item.start>=c.start+c.duration-0.001&&isTrackLocked(item.track))){setMessage('Ripple trim would move clips on a locked track. Unlock the track first.');return;} edgeDragRef.current = { id: c.id, edge: 'right', pointerX: e.clientX, start: c.start, duration: c.duration, trimStart: c.trimStart || 0, sourceDuration: c.sourceDuration || c.duration, track:c.track, tool:activeTool, lastRippleTotal:0 }; setSelectedId(c.id); }} className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize bg-white/25 hover:bg-white/70" />{c.type === 'image' && <img src={c.url} alt="" draggable="false" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"/>}<span className="relative block truncate font-bold">{c.name}</span><span className="relative">{timecode(c.start)} · {c.duration.toFixed(1)}s</span>{c.kind === 'audio' && c.waveform?.peaks && <svg className="mt-1 block h-4 w-full" viewBox={'0 0 ' + Math.max(1,c.waveform.peaks.length) + ' 16'} preserveAspectRatio="none">{c.waveform.peaks.map((p,i)=><rect key={i} x={i} y={(16-Math.max(1,p.peak*14))/2} width="1" height={Math.max(1,p.peak*14)} fill={p.rms < Math.pow(10,thresholdDb/20) ? '#64748b' : '#6ee7b7'} />)}</svg>}{c.kind === 'audio' && <audio ref={el => { if (el) audioTrackRefs.current[c.id] = el; else delete audioTrackRefs.current[c.id]; }} src={c.url} preload="auto" className="hidden" /> }<button onClick={e => { e.stopPropagation(); if (isTrackLocked(c.track)) { setMessage('This track is locked. Unlock it before deleting clips.'); return; } setClips(old => old.filter(x => x.id !== c.id)); if (selectedId === c.id) setSelectedId(''); }} className="absolute right-0 top-0 rounded bg-black/40 p-0.5" aria-label="Delete clip"><Trash2 size={10}/></button></div>)}
          </div>
        </div>)}
        <div className="pointer-events-none absolute bottom-0 top-0 z-20">{markers.map(marker=><div key={marker.id} title={marker.label+" · "+timecode(marker.time)} className="absolute bottom-0 top-0 w-px bg-amber-400/80" style={{left:144+marker.time*pxPerSecond}}><span className="absolute left-0 top-8 -translate-x-1/2 bg-amber-400 px-1 text-[9px] font-bold text-black">M</span></div>)}</div><div className="pointer-events-none absolute bottom-0 top-0 z-30" style={{ left: 144 + playhead * pxPerSecond }}><div className="h-full w-[2px] bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]"/><div className="-ml-[5px] h-3 w-3 rounded-b bg-sky-400"/><div className="absolute left-1 top-0 rounded bg-sky-400 px-1 py-0.5 font-mono text-[9px] font-bold text-slate-950">{timecode(playhead)}</div></div>
      </div>
    </div>
    <div className="grid gap-px border-t border-[#454545] bg-[#454545] lg:grid-cols-[1fr_280px]">
      <div className="bg-[#2a2a2a] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#454545] pb-2"><h3 className="text-xs font-bold text-slate-300">Media panel · drag a card onto V1/V2/V3/V4</h3><span className="text-[10px] text-slate-500">Drop position = timeline time</span></div>
        {mediaClips.length ? <div className="flex gap-2 overflow-x-auto pb-2">{mediaClips.map(c => <button key={c.id} draggable onDragStart={e => { e.dataTransfer.setData('application/x-vibepulse-media', c.id); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => { placeMedia(c, pendingTrack, playhead); }} className="w-24 shrink-0 border border-[#555] bg-[#333] p-2 text-left hover:border-[#7eb8e8]"><div className="h-16 overflow-hidden bg-[#151515]">{c.type === 'image' ? <img src={c.url} alt="" className="h-full w-full object-cover"/> : <video src={c.url} muted className="h-full w-full object-cover"/>}</div><div className="mt-1 truncate text-[10px]">{c.name}</div><div className="text-[9px] text-slate-500">Insert at playhead</div></button>)}</div> : <p className="text-xs text-slate-500">Import images/videos in the existing Media panel above, then drag them here.</p>}
        <div className="mt-2 flex flex-wrap gap-2 border-t border-[#454545] pt-2"><label className="cursor-pointer border border-[#555] bg-[#383838] px-3 py-2 text-[11px] hover:bg-[#484848]"><ImagePlus size={13} className="mr-1 inline"/>Import image/video<input type="file" accept="image/*,video/*" multiple hidden onChange={e => { Array.from(e.target.files || []).forEach(file => { const fake = { id: idOf(), file, name: file.name, type: file.type.startsWith('video/') ? 'video' : 'image', duration: 5 }; placeMedia(fake, pendingTrack, playhead); }); e.target.value = ''; }}/></label><label className="flex items-center gap-1 text-xs text-slate-400"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)}/> Snap to playhead / clip edges</label><label className="text-xs text-slate-400">Drop target<select value={pendingTrack} onChange={e => setPendingTrack(e.target.value)} className="ml-2 border border-[#555] bg-[#1f1f1f] p-1 text-[#ddd]">{tracks.filter(t => t.kind === 'visual').map(t => <option key={t.id} value={t.id}>{t.id}</option>)}</select></label></div>
      </div>
      <div className="bg-[#2a2a2a] p-3">
        <h3 className="mb-2 border-b border-[#454545] pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#c7c7c7]">Preview monitor</h3>
        <div className="relative grid aspect-video place-items-center overflow-hidden border border-[#454545] bg-[#151515]">
          {visualLayersForPreview.map((layer, index) => layer.type === 'image' ? <img key={layer.id} src={layer.url} alt="" className="absolute inset-0 h-full w-full object-contain" style={{zIndex:index+1,opacity:clipMotionAt(layer,playhead).opacity*clipTransitionAt(layer,playhead).opacity,transform:"translate("+(clipMotionAt(layer,playhead).x+clipTransitionAt(layer,playhead).slideX)+"%, "+clipMotionAt(layer,playhead).y+"%) scale("+clipMotionAt(layer,playhead).scale+")"}}/> : <video key={layer.id} ref={element=>{if(element){videoClipRefs.current[layer.id]=element;if(activeVideoForPreview?.id===layer.id)videoRef.current=element;}else{delete videoClipRefs.current[layer.id];if(videoRef.current?.dataset?.clipId===layer.id)videoRef.current=null;}}} data-clip-id={layer.id} src={layer.url} muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-contain" style={{zIndex:index+1,opacity:clipMotionAt(layer,playhead).opacity*clipTransitionAt(layer,playhead).opacity,transform:"translate("+(clipMotionAt(layer,playhead).x+clipTransitionAt(layer,playhead).slideX)+"%, "+clipMotionAt(layer,playhead).y+"%) scale("+clipMotionAt(layer,playhead).scale+")"}} onLoadedMetadata={e => { try { e.currentTarget.currentTime = Number(layer.trimStart || 0) + Math.max(0, playhead - layer.start); } catch {} }}/>)}
          {!visualLayersForPreview.length && <span className="text-xs text-slate-600">No visual clip at {timecode(playhead)}</span>}{activeTitle && <div className="pointer-events-none absolute inset-x-[6%] bottom-[12%] bg-black/65 px-4 py-3 text-center text-lg font-black text-white drop-shadow-lg" style={{opacity:activeTitle.animation==="fade"?Math.min(1,Math.max(0,(playhead-activeTitle.start)/0.8)):1,transform:activeTitle.animation==="slide"?"translateY("+Math.max(0,1-(playhead-activeTitle.start)/0.8)*24+"px)":activeTitle.animation==="pop"?"scale("+Math.min(1,Math.max(.2,(playhead-activeTitle.start)/0.8))+")":"none"}}>{activeTitle.text}</div>}{activeMap && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-950/60"><svg viewBox="0 0 640 360" className="h-full w-full" role="img" aria-label={"Documentary map graphic: "+activeMap.text}><defs><linearGradient id="map-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#102c3a"/><stop offset="100%" stopColor="#1b4850"/></linearGradient></defs><rect width="640" height="360" fill="url(#map-bg)"/><path d="M0 80 L110 60 L170 100 L230 75 L280 130 L350 110 L410 145 L480 120 L560 165 L640 140 M0 240 L90 215 L160 250 L230 220 L300 275 L390 240 L470 280 L550 245 L640 270 M120 0 L150 70 L130 150 L180 220 L160 360 M350 0 L330 80 L370 160 L340 240 L360 360 M520 0 L500 75 L530 160 L510 230 L540 360" stroke="#4f7b7e" strokeWidth="2" fill="none"/><path d="M110 245 Q180 150 285 190 T490 110" stroke="#fbbf24" strokeWidth="5" fill="none" strokeDasharray="10 8" strokeDashoffset={Math.max(0,1-(playhead-activeMap.start)/Math.max(.25,activeMap.duration))*160}/><circle cx="110" cy="245" r="8" fill="#f87171"/><circle cx="490" cy="110" r="8" fill="#f87171"/><text x="24" y="36" fill="white" fontSize="18" fontWeight="700">{activeMap.text}</text><text x="24" y="62" fill="#b7d7de" fontSize="11">DOCUMENTARY ROUTE</text></svg></div>}
        </div>
        {selectedClip && <div className="mt-3 space-y-3 border border-[#454545] bg-[#222] p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold">{selectedClip.name} · {selectedClip.track}</div><span className="font-mono text-cyan-200">{timecode(selectedClip.start)} → {timecode(selectedClip.start + selectedClip.duration)}</span></div>{selectedClip.kind === "visual" && ["image","video"].includes(selectedClip.type) && <div className="border border-[#454545] bg-[#1b1b1b] p-2"><div className="mb-2 font-bold text-slate-200">Transition in</div><div className="grid gap-2 sm:grid-cols-2"><label>Transition<select value={selectedClip.transitionIn||"cut"} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,transitionIn:e.target.value}:c))} className="mt-1 w-full border border-[#555] bg-[#171717] px-2 py-1.5 text-white"><option value="cut">Cut</option><option value="fade">Fade</option><option value="dissolve">Cross dissolve (with overlap)</option><option value="slide">Slide in</option></select></label><label>Duration {Number(selectedClip.transitionDuration||0.5).toFixed(1)}s<input type="range" min="0.1" max="3" step="0.1" value={Number(selectedClip.transitionDuration||0.5)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,transitionDuration:Number(e.target.value)}:c))} className="mt-1 w-full"/></label></div></div>}{selectedClip.kind === "visual" && ["image","video"].includes(selectedClip.type) && <div className="border border-[#454545] bg-[#1b1b1b] p-2"><div className="mb-2 flex items-center justify-between"><span className="font-bold text-slate-200">Motion & keyframes</span><button type="button" onClick={addSelectedKeyframe} className="border border-sky-700 bg-sky-950 px-2 py-1 text-[10px] text-sky-100">+ Add keyframe at playhead</button></div><div className="grid gap-2 sm:grid-cols-2"><label>Scale {Number(selectedClip.scale||1).toFixed(2)}×<input type="range" min="0.5" max="3" step="0.05" value={Number(selectedClip.scale||1)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,scale:Number(e.target.value)}:c))} className="w-full"/></label><label>Opacity {Math.round(Number(selectedClip.opacity??1)*100)}%<input type="range" min="0" max="1" step="0.05" value={Number(selectedClip.opacity??1)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,opacity:Number(e.target.value)}:c))} className="w-full"/></label><label>Position X {Number(selectedClip.x||0)}%<input type="range" min="-50" max="50" step="1" value={Number(selectedClip.x||0)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,x:Number(e.target.value)}:c))} className="w-full"/></label><label>Position Y {Number(selectedClip.y||0)}%<input type="range" min="-50" max="50" step="1" value={Number(selectedClip.y||0)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,y:Number(e.target.value)}:c))} className="w-full"/></label></div><p className="mt-1 text-[10px] text-slate-400">{(selectedClip.keyframes||[]).length} keyframe(s) · values interpolate between keyframes</p></div>}{selectedClip.kind === "audio" && <div className="grid gap-3 sm:grid-cols-3"><label className="block text-slate-300">Volume {Math.round(Number(selectedClip.volume ?? 1)*100)}%<input type="range" min="0" max="1" step="0.05" value={Number(selectedClip.volume ?? 1)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,volume:Number(e.target.value)}:c))} className="mt-1 w-full"/></label><label className="block text-slate-300">Fade in {Number(selectedClip.fadeIn||0).toFixed(1)}s<input type="range" min="0" max={Math.min(5,Math.max(0.1,selectedClip.duration/2))} step="0.1" value={Number(selectedClip.fadeIn||0)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,fadeIn:Number(e.target.value)}:c))} className="mt-1 w-full"/></label><label className="block text-slate-300">Fade out {Number(selectedClip.fadeOut||0).toFixed(1)}s<input type="range" min="0" max={Math.min(5,Math.max(0.1,selectedClip.duration/2))} step="0.1" value={Number(selectedClip.fadeOut||0)} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,fadeOut:Number(e.target.value)}:c))} className="mt-1 w-full"/></label></div>}{(selectedClip.type === "title" || selectedClip.type === "map") && <div className="grid gap-2 sm:grid-cols-2"><label className="block text-slate-300">{selectedClip.type === "title" ? "Title text" : "Map label"}<input value={selectedClip.text || ""} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,text:e.target.value,name:selectedClip.type==="title"?e.target.value:"Map · "+e.target.value}:c))} className="mt-1 w-full border border-[#555] bg-[#171717] px-2 py-1.5 text-white"/></label><label className="block text-slate-300">Animation<select value={selectedClip.animation || (selectedClip.type==="map"?"route":"fade")} onChange={e=>setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,animation:e.target.value}:c))} className="mt-1 w-full border border-[#555] bg-[#171717] px-2 py-1.5 text-white">{(selectedClip.type==="map"?[["Animated route","route"],["Pulse marker","pulse"],["Fade in","fade"]]:[["Fade in","fade"],["Slide up","slide"],["Pop","pop"],["Static","none"]]).map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label></div>}<label className="block">Clip position: {selectedClip.start.toFixed(2)}s<input aria-label="Clip start" type="range" min="0" max={Math.max(0, timelineDuration)} step="0.05" value={selectedClip.start} onChange={e => setClips(old => old.map(c => c.id === selectedClip.id ? { ...c, start: snapTime(Number(e.target.value), c.id) } : c))} className="w-full"/></label><label className="block">Trim start: {selectedClip.trimStart.toFixed(2)}s<input aria-label="Trim start" type="range" min="0" max={Math.max(0, (selectedClip.sourceDuration || selectedClip.duration) - 0.25)} step="0.05" value={selectedClip.trimStart} onChange={e => { const trimStart = Number(e.target.value); const maxDuration = Math.max(0.25, (selectedClip.sourceDuration || selectedClip.duration) - trimStart); setClips(old => old.map(c => c.id === selectedClip.id ? { ...c, trimStart, duration: Math.min(c.duration, maxDuration), trimEnd: trimStart + Math.min(c.duration, maxDuration) } : c)); }} className="w-full"/></label><label className="block">Clip duration: {selectedClip.duration.toFixed(2)}s<input aria-label="Clip duration" type="range" min="0.25" max={Math.max(0.25, (selectedClip.sourceDuration || selectedClip.duration) - selectedClip.trimStart)} step="0.05" value={selectedClip.duration} onChange={e => trimSelected('right', selectedClip.start + Number(e.target.value))} className="w-full"/></label><div className="flex flex-wrap gap-2"><button onClick={() => { setPlayhead(selectedClip.start); seekTo(selectedClip.start); }} className="rounded border border-white/10 px-2 py-1">Go to clip start</button><button onClick={splitAtPlayhead} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1"><Scissors size={12}/> Split at playhead</button><button onClick={() => { setClips(old => old.filter(x => x.id !== selectedClip.id)); setSelectedId(''); }} className="inline-flex items-center gap-1 rounded border border-rose-400/30 px-2 py-1 text-rose-200"><Trash2 size={12}/> Delete clip</button></div></div>}
      </div>
    </div>
    <p className="border-t border-[#454545] bg-[#292929] px-3 py-2 text-[11px] text-[#aaa]">{notice} · Drag media while voiceover is playing or pause at a sentence, insert at playhead, then resume. Waveform shows real sample peaks; silence regions use the configured RMS threshold and minimum duration.</p>
  </section>;
}
