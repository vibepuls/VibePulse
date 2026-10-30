import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VoiceTimeline from './VoiceTimeline';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Download, Film, ImagePlus, Music2, Pause, Play, Plus, Sparkles, Trash2, Volume2, WandSparkles, SlidersHorizontal, Save, RotateCcw } from 'lucide-react';
import { AUTO_STYLES, FILTER_PRESETS, MOTION_OPTIONS, TRANSITION_OPTIONS, VFX_OPTIONS, createAutoCutPlan, buildColorFilter } from '../lib/autocutEngine';
import { saveAutoCutProject, listAutoCutProjects, loadAutoCutProject, deleteAutoCutProject, saveAutoCutExport, listAutoCutExports, getAutoCutExport, deleteAutoCutExport } from '../lib/autocutStorage';

const PRESETS = {
  'cinematic-gold': { label:'Golden Cinema', filter:'sepia(.16) contrast(1.12) saturate(.9)', motion:'zoom', duration:3.2, transition:'fade' },
  'love-moments': { label:'Love Story', filter:'sepia(.1) saturate(1.12) brightness(1.04)', motion:'zoom', duration:2.6, transition:'fade' },
  'travel-diary': { label:'Travel Diary', filter:'saturate(1.2) contrast(1.05)', motion:'pan', duration:2.2, transition:'slide' },
  'birthday-recap': { label:'Birthday Memories', filter:'saturate(1.35) brightness(1.04)', motion:'zoom', duration:1.8, transition:'flash' },
  'dark-attitude': { label:'Dark Attitude', filter:'contrast(1.3) brightness(.82) saturate(.8)', motion:'shake', duration:1.6, transition:'flash' },
  'photo-beat': { label:'Photo Beat Sync', filter:'contrast(1.12) saturate(1.25)', motion:'zoom', duration:1.2, transition:'flash' },
  'reel-flash': { label:'Flashback Reel', filter:'contrast(1.15) saturate(1.3)', motion:'shake', duration:1.2, transition:'flash' },
  'docu-story': { label:'Documentary Story', filter:'contrast(1.1) saturate(.86)', motion:'pan', duration:3.6, transition:'fade' },
  'city-lights': { label:'City After Dark', filter:'contrast(1.2) saturate(1.25)', motion:'zoom', duration:2.5, transition:'fade' },
  'velocity-rush': { label:'Velocity Rush', filter:'contrast(1.2) saturate(1.35)', motion:'shake', duration:1, transition:'flash' },
  'beat-drop': { label:'Beat Drop Montage', filter:'contrast(1.12) saturate(1.3)', motion:'zoom', duration:1.1, transition:'flash' },
  'glow-up': { label:'Glow Up', filter:'brightness(1.08) saturate(1.2)', motion:'zoom', duration:2.2, transition:'flash' },
  'aesthetic-dream': { label:'Aesthetic Dream', filter:'brightness(1.06) saturate(.9) sepia(.06)', motion:'pan', duration:2.8, transition:'fade' },
  '3d-photo-depth': { label:'3D Photo Depth', filter:'contrast(1.08) saturate(1.08)', motion:'pan', duration:2.5, transition:'slide' },
  'meme-reaction': { label:'Meme Reaction', filter:'contrast(1.12) saturate(1.15)', motion:'shake', duration:1.4, transition:'flash' },
  'makeup-transition': { label:'Beauty Switch', filter:'brightness(1.05) saturate(1.08)', motion:'zoom', duration:2.1, transition:'fade' },
  'couple-story': { label:'Couple Story', filter:'saturate(1.1) sepia(.1)', motion:'pan', duration:2.7, transition:'fade' },
  'flash-fit-check': { label:'Fit Check Flash', filter:'contrast(1.16) saturate(1.2)', motion:'zoom', duration:1.2, transition:'flash' },
  'concert-hype': { label:'Concert Hype', filter:'contrast(1.18) saturate(1.45)', motion:'shake', duration:1.3, transition:'flash' },
  'mini-vlog': { label:'Mini Vlog Diary', filter:'saturate(1.15) contrast(1.04)', motion:'pan', duration:2, transition:'slide' },
  'pet-comedy': { label:'Pet Comedy', filter:'saturate(1.2) brightness(1.05)', motion:'zoom', duration:1.7, transition:'flash' },
};
const DEFAULT_PRESET = { label:'Creator Mix', filter:'none', motion:'zoom', duration:2.5, transition:'fade' };
const makeId = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
const formatTime = (s) => { const n=Math.max(0,Number(s)||0); return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'); };

async function detectBeatTimes(file) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return { beats: [], waveform: [] };
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const channel = decoded.getChannelData(0);
    const windowSize = Math.max(512, Math.floor(decoded.sampleRate * 0.045));
    const energies = [];
    for (let start = 0; start < channel.length; start += windowSize) {
      const end = Math.min(channel.length, start + windowSize);
      let sum = 0;
      for (let i = start; i < end; i += 1) sum += channel[i] * channel[i];
      energies.push({ time: start / decoded.sampleRate, energy: Math.sqrt(sum / Math.max(1, end - start)) });
    }
    const average = energies.reduce((sum, item) => sum + item.energy, 0) / Math.max(1, energies.length);
    const peak = Math.max(0.0001, energies.reduce((max,item)=>Math.max(max,item.energy),0));
    const waveform = energies.filter((_,i)=>i%Math.max(1,Math.floor(energies.length/160))===0).slice(0,160).map(item=>Math.max(.06,Math.min(1,item.energy/peak)));
    const beats = [0];
    let last = -1;
    for (let i = 1; i < energies.length - 1; i += 1) {
      const current = energies[i];
      if (current.energy >= average * 1.35 && current.energy >= energies[i-1].energy && current.energy > energies[i+1].energy && current.time - last >= 0.28) {
        beats.push(Number(current.time.toFixed(3))); last = current.time;
      }
    }
    return { beats: beats.length > 1 ? beats : [], waveform };
  } finally { await context.close().catch(() => {}); }
}
function frameTiming(elapsed, clips, beatSync, beatTimes) {
  if (beatSync && beatTimes.length >= clips.length && beatTimes.length > 1) {
    let index = 0;
    for (let i = 1; i < beatTimes.length; i += 1) { if (beatTimes[i] > elapsed) break; index = i; }
    index = Math.min(clips.length - 1, index);
    const start = beatTimes[Math.min(index, beatTimes.length - 1)] || 0;
    const end = beatTimes[index + 1] || (start + (clips[index]?.duration || 1));
    return { index, progress: Math.max(0, Math.min(1, (elapsed - start) / Math.max(0.1, end - start))) };
  }
  let cursor = 0;
  for (let i = 0; i < clips.length; i += 1) {
    const duration = Math.max(0.1, Number(clips[i].duration) || 1);
    if (elapsed < cursor + duration || i === clips.length - 1) return { index: i, progress: Math.max(0, Math.min(1, (elapsed - cursor) / duration)) };
    cursor += duration;
  }
  return { index: Math.max(0, clips.length - 1), progress: 1 };
}


export default function TemplateVideoMaker() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [language, setLanguage] = useState(() => localStorage.getItem('vibepulse-language') || 'en');
  const [inspectorTab, setInspectorTab] = useState('edit');
  const bn = language === 'bn';
  const tr = (en, bangla) => bn ? bangla : en;
  const toggleLanguage = () => { const next = bn ? 'en' : 'bn'; setLanguage(next); localStorage.setItem('vibepulse-language', next); window.dispatchEvent(new Event('vibepulse-language-change')); };
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState('');
  const musicInputRef = useRef(null);
  const rafRef = useRef(0);
  const historyRef = useRef({ past: [], future: [], current: null, signature: '', applying: false });
  const [, setHistoryVersion] = useState(0);
  const cancelExportRef = useRef(false);
  const mediaRef = useRef([]);
  const [templateId, setTemplateId] = useState(location.state?.templateId || new URLSearchParams(location.search).get('template') || 'cinematic-gold');
  const customConfig = location.state?.templateConfig || {};
  const preset = { ...(PRESETS[templateId] || DEFAULT_PRESET), ...customConfig, duration: Number(customConfig.clipDuration || customConfig.duration || (PRESETS[templateId] || DEFAULT_PRESET).duration) };
  const [clips, setClips] = useState([]);
  const [music, setMusic] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.9);
  const [beatTimes, setBeatTimes] = useState([]);
  const [audioWaveform, setAudioWaveform] = useState([]);
  const [title, setTitle] = useState('');
  const [textAnimation, setTextAnimation] = useState('fade');
  const [clipDuration, setClipDuration] = useState(preset.duration);
  const [motion, setMotion] = useState(preset.motion);
  const [filter, setFilter] = useState(preset.filter);
  const [transition, setTransition] = useState(preset.transition);
  const [beatSync, setBeatSync] = useState(false);
  const [autoStyle, setAutoStyle] = useState('smart');
  const [visualEffect, setVisualEffect] = useState('none');
  const [effectIntensity, setEffectIntensity] = useState(45);
  const [motionSpeed, setMotionSpeed] = useState(1);
  const [colorControls, setColorControls] = useState({ exposure:0, brightness:0, contrast:0, saturation:0, temperature:0, tint:0 });
  const [textColor, setTextColor] = useState('#ffffff');
  const [textFont, setTextFont] = useState('sans-serif');
  const [textOutline, setTextOutline] = useState(true);
  const [textShadow, setTextShadow] = useState(true);
  const [audioFadeIn, setAudioFadeIn] = useState(0.5);
  const [audioFadeOut, setAudioFadeOut] = useState(0.8);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState('720p');
  const [exportFps, setExportFps] = useState(30);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [exportsOpen, setExportsOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState([]);
  const [savedExports, setSavedExports] = useState([]);
  const [projectName, setProjectName] = useState('My AutoCut Project');
  const [playing, setPlaying] = useState(false);
  const [dragClipId, setDragClipId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('Choose photos or videos to start building your template video.');
  const [exportUrl, setExportUrl] = useState('');
  const [exportMime, setExportMime] = useState('');
  const [selected, setSelected] = useState('');
  const [aspect, setAspect] = useState(location.state?.templateAspectRatio || '9:16');
  const [requiredSlots, setRequiredSlots] = useState(Number(location.state?.templateRequiredSlots || 0));
  const [requiredMediaMode, setRequiredMediaMode] = useState(location.state?.templateMediaMode || 'MIXED');
  const [publishing, setPublishing] = useState(false);
  const totalDuration = Math.max(0.1, clips.reduce((n,c)=>n+c.duration,0));
  const selectedClip = clips.find(c=>c.id===selected) || clips[0];

  useEffect(() => { listAutoCutProjects().then(setSavedProjects).catch(()=>{}); listAutoCutExports().then(setSavedExports).catch(()=>{}); }, []);
  useEffect(() => {
    const signature=JSON.stringify(clips.map(c=>({id:c.id,duration:c.duration,trimStart:c.trimStart,trimEnd:c.trimEnd,motion:c.motion,transition:c.transition,effect:c.effect,effectIntensity:c.effectIntensity,filter:c.filter,name:c.name})));
    const history=historyRef.current;
    if(history.applying){history.applying=false;history.current=clips;history.signature=signature;setHistoryVersion(v=>v+1);return;}
    if(history.current&&signature!==history.signature){history.past.push(history.current);if(history.past.length>40)history.past.shift();history.future=[];}
    history.current=clips;history.signature=signature;setHistoryVersion(v=>v+1);
  },[clips]);
  function undoEdit(){const h=historyRef.current;if(!h.past.length)return;h.future.push(clips);const previous=h.past.pop();h.applying=true;setClips(previous);setExportUrl('');setHistoryVersion(v=>v+1);}
  function redoEdit(){const h=historyRef.current;if(!h.future.length)return;h.past.push(clips);const next=h.future.pop();h.applying=true;setClips(next);setExportUrl('');setHistoryVersion(v=>v+1);}
  useEffect(()=>{const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redoEdit():undoEdit();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redoEdit();}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);});

  useEffect(() => {
    const incoming = location.state?.templateFiles;
    if (incoming?.length) addFiles(incoming, true);
    if (location.state?.templateMusicUrl) { setMusicUrl(location.state.templateMusicUrl); setNotice('This template includes music. Confirm you have rights to use it before publishing.'); }
    const id = location.state?.templateId || new URLSearchParams(location.search).get('template');
    if (id) api.get('/templates').then(({data}) => { const item = (Array.isArray(data) ? data : []).find(t => t.id === id); if (!item) return; const cfg = item.config || {}; const base = PRESETS[id] || DEFAULT_PRESET; setFilter(cfg.filter || base.filter); setMotion(cfg.motion || base.motion); setTransition(cfg.transition || base.transition); setClipDuration(Number(cfg.clipDuration || cfg.duration || base.duration)); setRequiredSlots(Number(item.requiredSlots || 0)); setRequiredMediaMode(item.mediaMode || 'MIXED'); setAspect(item.aspectRatio || '9:16'); }).catch(()=>{});
    // Apply a preset only on initial route entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl); audio.loop = true; audio.volume = musicVolume;
    if (playing) audio.play().catch(() => {});
    return () => { audio.pause(); audio.currentTime = 0; };
  }, [playing, musicUrl, musicVolume]);

  useEffect(() => {
    if (playing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = aspect === '9:16' ? 540 : aspect === '1:1' ? 720 : 960;
    canvas.height = aspect === '9:16' ? 960 : aspect === '1:1' ? 720 : 540;
    if (!clips.length) {
      ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#3b414b'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48); ctx.setLineDash([]);
      ctx.fillStyle = '#e5e7eb'; ctx.textAlign = 'center'; ctx.font = '600 25px system-ui';
      ctx.fillText('AutoCut Studio', canvas.width / 2, canvas.height / 2 - 18);
      ctx.fillStyle = '#9ca3af'; ctx.font = '16px system-ui';
      ctx.fillText('Import photos or videos to begin editing', canvas.width / 2, canvas.height / 2 + 18);
      return;
    }
    const clip = clips.find(c => c.id === selected) || clips[0];
    drawClip(ctx, canvas, clip, 0, motion, filter, transition, Math.max(0, clips.indexOf(clip)));
  }, [playing, clips, selected, aspect, motion, filter, transition, visualEffect, effectIntensity, colorControls, title, textAnimation, textColor, textFont, textOutline, textShadow, motionSpeed]);

  useEffect(() => {
    if (!playing || !clips.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const start = performance.now();
    const draw = (now) => {
      const elapsed = (now-start)/1000;
      const timing = frameTiming(elapsed, clips, beatSync, beatTimes);
      const index = timing.index;
      const clip = clips[index];
      const local = timing.progress;
      canvas.width = aspect==='9:16' ? 540 : aspect==='1:1' ? 720 : 960;
      canvas.height = aspect==='9:16' ? 960 : aspect==='1:1' ? 720 : 540;
      drawClip(ctx, canvas, clip, local, motion, filter, transition, index);
      if (elapsed < totalDuration) rafRef.current=requestAnimationFrame(draw);
      else setPlaying(false);
    };
    rafRef.current=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, clips, clipDuration, motion, filter, transition, beatSync, beatTimes, aspect, totalDuration, visualEffect, effectIntensity, colorControls, title, textAnimation, textColor, textFont, textOutline, textShadow, motionSpeed]);

  useEffect(() => () => {
    clips.forEach(c=>{ if(c.url) URL.revokeObjectURL(c.url); });
    if(musicUrl) URL.revokeObjectURL(musicUrl);
    if(exportUrl) URL.revokeObjectURL(exportUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(fileList, initial=false) {
    const all=Array.from(fileList||[]);
    const supported=all.filter(f => ['image/jpeg','image/png','image/webp'].includes(f.type) || ['video/mp4','video/quicktime','video/webm'].includes(f.type));
    if (supported.length !== all.length) setNotice('Only JPG, PNG, WEBP, MP4, MOV and WEBM files are supported. Unsupported files were skipped.');
    const files=supported.filter(f => f.size <= (f.type.startsWith('video/') ? 100 : 15) * 1024 * 1024);
    if (files.length !== supported.length) setNotice('Files over the size limit were skipped (images 15 MB, videos 50 MB).');
    if(!files.length) { if(!initial) setNotice('Choose supported media: JPG, PNG, WEBP, MP4, MOV or WEBM.'); return; }
    if (requiredSlots && clips.length + files.length > requiredSlots) { setNotice('This template requires exactly ' + requiredSlots + ' media files. You can add up to ' + Math.max(0, requiredSlots - clips.length) + ' more.'); return; }
    const added=files.map(file=>({id:makeId(),file,name:file.name,type:file.type.startsWith('video/')?'video':'image',url:URL.createObjectURL(file),duration:file.type.startsWith('video/')?Math.min(8,clipDuration*2):clipDuration,trimStart:0,trimEnd:0,sourceDuration:0,speed:1}));
    added.filter(c=>c.type==='video').forEach(clip=>{const probe=document.createElement('video');probe.preload='metadata';probe.onloadedmetadata=()=>{const duration=Number.isFinite(probe.duration)?probe.duration:clip.duration;setClips(old=>old.map(c=>c.id===clip.id?{...c,sourceDuration:duration,trimStart:0,trimEnd:Math.min(duration,c.duration),duration:Math.min(duration,Math.max(.25,c.duration))}:c));probe.src='';};probe.onerror=()=>{setClips(old=>old.map(c=>c.id===clip.id?{...c,trimEnd:c.duration,sourceDuration:c.duration}:c));};probe.src=clip.url;});
    setClips(old=>[...old,...added]);
    setSelected(old=>old||added[0].id);
    setNotice(`${added.length} media file(s) added. Reorder or remove clips, then preview and export.`);
    setExportUrl(''); setExportMime('');
  }
  function replaceClip(file) {
    if (!file || !replaceTarget) return;
    const isImage = ['image/jpeg','image/png','image/webp'].includes(file.type);
    const isVideo = ['video/mp4','video/quicktime','video/webm'].includes(file.type);
    const valid = (isImage || isVideo) && (requiredMediaMode === 'MIXED' || (requiredMediaMode === 'PHOTO' && isImage) || (requiredMediaMode === 'VIDEO' && isVideo));
    if (!valid) { setNotice('Only JPG, PNG, WEBP, MP4, MOV and WEBM files are supported.'); setReplaceTarget(''); return; }
    if (file.size > (file.type.startsWith('video/') ? 100 : 15) * 1024 * 1024) { setNotice('Images must be under 15 MB and videos under 50 MB.'); setReplaceTarget(''); return; }
    const url = URL.createObjectURL(file);
    setClips(old => old.map(clip => { if (clip.id !== replaceTarget) return clip; if (clip.url) URL.revokeObjectURL(clip.url); return {...clip,file,name:file.name,type:isVideo?'video':'image',url,duration:isVideo?Math.min(8,clipDuration*2):clipDuration,trimStart:0,trimEnd:0,sourceDuration:0,speed:1}; }));
    if(isVideo){const probe=document.createElement('video');probe.preload='metadata';probe.onloadedmetadata=()=>{const duration=Number.isFinite(probe.duration)?probe.duration:clipDuration*2;setClips(old=>old.map(c=>c.id===replaceTarget?{...c,sourceDuration:duration,trimEnd:Math.min(duration,c.duration),duration:Math.min(duration,Math.max(.25,c.duration))}:c));probe.src='';};probe.src=url;}
    setSelected(replaceTarget); setReplaceTarget(''); setExportUrl(''); setNotice('Media replaced. Preview the video again before exporting.');
  }
  function removeClip(id) {
    setClips(old=>{const target=old.find(c=>c.id===id);if(target?.url)URL.revokeObjectURL(target.url);return old.filter(c=>c.id!==id);});
    if(selected===id) setSelected(clips.find(c=>c.id!==id)?.id||'');
    setExportUrl('');
  }
  function moveClip(index,step) {
    const to=index+step;if(to<0||to>=clips.length)return;
    setClips(old=>{const next=[...old];[next[index],next[to]]=[next[to],next[index]];return next;});setExportUrl('');
  }
  function duplicateClip(id) {
    const source=clips.find(c=>c.id===id);if(!source)return;
    const copy={...source,id:makeId(),url:URL.createObjectURL(source.file),name:source.name+' copy'};
    setClips(old=>{const at=old.findIndex(c=>c.id===id);const next=[...old];next.splice(at+1,0,copy);return next;});setSelected(copy.id);setExportUrl('');setNotice('Clip duplicated.');
  }
  function splitPhotoClip(id) {
    const source=clips.find(c=>c.id===id);if(!source)return;
    if(source.type!=='image'){setNotice('Photo split is available now. Video clip splitting needs precise browser media seeking and is being kept disabled rather than producing inaccurate cuts.');return;}
    if(source.duration<1){setNotice('This clip is too short to split.');return;}
    const first={...source,duration:Number((source.duration/2).toFixed(2))},second={...source,id:makeId(),url:URL.createObjectURL(source.file),duration:Number((source.duration-first.duration).toFixed(2)),motion:'slowZoomOut',name:source.name+' split'};
    setClips(old=>{const at=old.findIndex(c=>c.id===id);const next=[...old];next.splice(at,1,first,second);return next;});setSelected(second.id);setExportUrl('');setNotice('Photo clip split into two timed scenes.');
  }
  function reorderClip(from,to){if(from===to||from<0||to<0||from>=clips.length||to>=clips.length)return;setClips(old=>{const next=[...old];const [item]=next.splice(from,1);next.splice(to,0,item);return next;});setExportUrl('');}
  function updateVideoTrim(id,edge,value){const clip=clips.find(c=>c.id===id);if(!clip||clip.type!=='video')return;const sourceDuration=Number(clip.sourceDuration||clip.trimEnd||clip.duration);const minGap=.25;let start=Number(clip.trimStart||0),end=Number(clip.trimEnd||sourceDuration);if(edge==='start')start=Math.min(Math.max(0,Number(value)),end-minGap);else end=Math.max(Math.min(sourceDuration,Number(value)),start+minGap);setClips(old=>old.map(c=>c.id===id?{...c,trimStart:start,trimEnd:end,duration:Math.max(minGap,end-start)/Math.max(.25,Number(c.speed||1))}:c));setExportUrl('');setExportMime('');}
  function updateVideoSpeed(id,value){const speed=Number(value);const clip=clips.find(c=>c.id===id);if(!clip||clip.type!=='video')return;const start=Number(clip.trimStart||0),end=Number(clip.trimEnd||clip.sourceDuration||clip.duration);setClips(old=>old.map(c=>c.id===id?{...c,speed,duration:Math.max(.25,end-start)/Math.max(.25,speed)}:c));setExportUrl('');setExportMime('');}
  async function chooseMusic(file) {
    if(!file)return;
    if(!file.type.startsWith('audio/') || file.size > 30 * 1024 * 1024) { setNotice('Choose an audio file smaller than 30 MB.'); return; }
    if(musicUrl)URL.revokeObjectURL(musicUrl);
    setMusic(file);setMusicUrl(URL.createObjectURL(file));setNotice('Analyzing music rhythm…');
    try { const analysis = await detectBeatTimes(file); const beats=analysis.beats||[]; setBeatTimes(beats); setAudioWaveform(analysis.waveform||[]); setNotice(beats.length > 1 ? `Analyzed audio waveform and detected ${beats.length - 1} beat candidates. Enable Music Beat Sync to align cuts to them.` : 'Music waveform is ready. Clear beat peaks were not detected; normal timing remains available.'); }
    catch { setBeatTimes([]); setAudioWaveform([]); setNotice('Music is ready, but waveform/beat analysis was unavailable in this browser.'); }
    setExportUrl(''); setExportMime('');
  }
  function drawClip(ctx,canvas,clip,progress,motionName,filterValue,transitionName,index) {
    progress=Math.max(0,Math.min(1,progress*motionSpeed));
    ctx.fillStyle='#090b14';ctx.fillRect(0,0,canvas.width,canvas.height);
    if(!clip){ctx.fillStyle='#fff';ctx.font='28px sans-serif';ctx.fillText('Add photos or videos',35,70);return;}
    let source=mediaRef.current.find(x=>x.id===clip.id);
    if(!source){if(clip.type==='image'){const img=new Image();img.src=clip.url;source={id:clip.id,el:img};mediaRef.current.push(source);}else{const video=document.createElement('video');video.src=clip.url;video.muted=true;video.playsInline=true;video.loop=true;video.preload='auto';source={id:clip.id,el:video};mediaRef.current.push(source);video.play().catch(()=>{});}}
    const el=source.el,activeMotion=clip.motion||motionName,activeTransition=clip.transition||transitionName,activeFilter=buildColorFilter(clip.filter||filterValue,colorControls),activeEffect=clip.effect||visualEffect;
    if(el instanceof HTMLVideoElement){const startAt=Math.max(0,Number(clip.trimStart||0)),endAt=Number(clip.trimEnd||clip.sourceDuration||el.duration||clip.duration);if(!el.seeking&&(el.currentTime<startAt-.15||el.currentTime>=endAt-.08)){try{el.currentTime=startAt;}catch{}}}
    const strength=Math.max(0,Math.min(1,Number(clip.effectIntensity??effectIntensity/100)));
    if(el instanceof HTMLVideoElement){const rate=['slow','slowZoomIn','slowZoomOut'].includes(activeMotion)?.65:activeMotion==='fastZoom'?1.25:1;const speed=Math.max(.25,Number(clip.speed||1))*rate;if(el.playbackRate!==speed)el.playbackRate=speed;}
    if(el instanceof HTMLImageElement&&!el.complete)return;if(el instanceof HTMLVideoElement&&el.readyState<2){el.play().catch(()=>{});return;}
    const w=el.videoWidth||el.naturalWidth||canvas.width,h=el.videoHeight||el.naturalHeight||canvas.height;if(!w||!h)return;
    let scale=Math.max(canvas.width/w,canvas.height/h),pulse=Math.sin(progress*Math.PI*2),shake=activeMotion==='shake'?Math.sin(progress*52)*(.012+strength*.035):0;
    if(['zoom','slowZoomIn','kenBurns','parallax','zoomPulse','fastZoom','popUp'].includes(activeMotion))scale*=1+(activeMotion==='fastZoom'?progress*.3:activeMotion==='zoomPulse'?pulse*.035:progress*(activeMotion==='slowZoomIn'?.11:.17));
    if(activeMotion==='slowZoomOut')scale*=1.16-progress*.12;if(['pan','panLeft','panRight','tiltUp','tiltDown'].includes(activeMotion))scale*=1.12;
    if(activeMotion==='bounce')scale*=1+Math.abs(Math.sin(progress*Math.PI*3))*.035;if(activeMotion==='elastic')scale*=1+Math.sin(progress*Math.PI*5)*(1-progress)*.05;
    const dw=w*scale,dh=h*scale;let dx=(canvas.width-dw)/2,dy=(canvas.height-dh)/2;
    if(['pan','panLeft','kenBurns'].includes(activeMotion))dx-=(dw-canvas.width)*progress*.35;if(activeMotion==='panRight')dx+=(dw-canvas.width)*progress*.35;
    if(activeMotion==='tiltUp')dy-=(dh-canvas.height)*progress*.3;if(activeMotion==='tiltDown')dy+=(dh-canvas.height)*progress*.3;
    if(activeMotion==='slideLeft')dx-=canvas.width*(1-progress);if(activeMotion==='slideRight')dx+=canvas.width*(1-progress);if(activeMotion==='slideUp')dy-=canvas.height*(1-progress);if(activeMotion==='slideDown')dy+=canvas.height*(1-progress);
    dx+=shake*canvas.width;dy+=activeMotion==='shake'?Math.cos(progress*43)*(.01+strength*.025)*canvas.height:0;
    let rotation=0;if(activeMotion==='spin')rotation=(1-progress)*Math.PI*2;if(['rotate','swing'].includes(activeMotion))rotation=Math.sin(progress*Math.PI*(activeMotion==='swing'?3:2))*(activeMotion==='swing'?.07:.12);
    ctx.save();if(activeMotion==='flip'&&progress<.5){ctx.translate(canvas.width,0);ctx.scale(-1,1);}ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation);ctx.translate(-canvas.width/2,-canvas.height/2);
    ctx.filter=activeMotion==='blurReveal'?'blur('+Math.max(0,(1-progress)*12)+'px)':activeEffect==='glow'?'brightness('+(1+strength*.2)+') saturate('+(1+strength*.25)+')':activeEffect==='vhs'?'contrast(1.12) saturate(.8)':activeFilter||'none';try{ctx.drawImage(el,dx,dy,dw,dh);}catch{}ctx.restore();
    if(['fade','dissolve'].includes(activeTransition)&&progress<.14){ctx.fillStyle='rgba(0,0,0,'+((1-progress/.14)*(activeTransition==='fade'?.9:.5))+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(['flash','whiteFlash'].includes(activeTransition)&&progress<.16){ctx.fillStyle='rgba(255,255,255,'+((1-progress/.16)*.82)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(activeTransition==='blackFlash'&&progress<.16){ctx.fillStyle='rgba(0,0,0,'+((1-progress/.16)*.9)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(['slide','swipe','push','zoom'].includes(activeTransition)&&progress<.2){ctx.fillStyle='rgba(0,0,0,'+((1-progress/.2)*.2)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(['glitch','rgb','chromatic'].includes(activeTransition)||['glitch','rgb','chromatic'].includes(activeEffect)){const amount=(activeTransition==='glitch'?1:strength)*8;if(amount>.1){ctx.save();ctx.globalAlpha=.18+strength*.18;ctx.fillStyle='#ff285b';ctx.fillRect((progress*canvas.width*2)%canvas.width,0,Math.max(2,amount),canvas.height);ctx.fillStyle='#20e6ff';ctx.fillRect(canvas.width-(progress*canvas.width*2)%canvas.width,0,Math.max(2,amount),canvas.height);ctx.restore();}}
    if(['vignette','filmBurn','lightLeak'].includes(activeEffect)){const g=ctx.createRadialGradient(canvas.width*.5,canvas.height*.45,canvas.width*.12,canvas.width*.5,canvas.height*.5,canvas.width*.75);if(activeEffect==='vignette'){g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(.72*strength)+')');}else{g.addColorStop(0,'rgba(255,120,35,0)');g.addColorStop(1,'rgba(255,100,30,'+(.5*strength)+')');}ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(['grain','dust','vhs'].includes(activeEffect)){ctx.save();ctx.globalAlpha=.08+strength*.13;for(let n=0;n<Math.floor(20+strength*60);n++){ctx.fillStyle=n%2?'#fff':'#111';ctx.fillRect((n*137+Math.floor(progress*200))%canvas.width,(n*239+Math.floor(progress*320))%canvas.height,n%3+1,n%3+1);}if(activeEffect==='vhs'){ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(0,(progress*canvas.height*3)%canvas.height,canvas.width,2);}ctx.restore();}
    if(['sparkle','bokeh','snow','rain'].includes(activeEffect)){ctx.save();ctx.globalAlpha=.2+strength*.45;for(let n=0;n<(activeEffect==='bokeh'?12:24);n++){const x=(n*97+Math.sin(progress*5+n)*25+canvas.width)%canvas.width,y=(n*173+progress*canvas.height*(activeEffect==='rain'?1.5:.25))%canvas.height;ctx.beginPath();ctx.arc(x,y,activeEffect==='bokeh'?4+(n%4)*3:1+(n%2),0,Math.PI*2);ctx.fillStyle=activeEffect==='rain'?'#bfe9ff':'#fff';ctx.fill();}ctx.restore();}
    if(['glow','neon'].includes(activeEffect)){ctx.save();ctx.globalAlpha=strength*.25;ctx.strokeStyle=activeEffect==='neon'?'#53eaff':'#fff';ctx.lineWidth=5;ctx.strokeRect(5,5,canvas.width-10,canvas.height-10);ctx.restore();}
    if(title){const alpha=textAnimation==='fade'?Math.min(1,progress*4):1,y=canvas.height*.88+(textAnimation==='slide'?(1-Math.min(1,progress*4))*canvas.height*.08:0),scaleText=textAnimation==='pop'?.75+.25*Math.min(1,progress*5):textAnimation==='bounce'?1+Math.sin(progress*Math.PI*5)*(1-progress)*.08:1,text=textAnimation==='typewriter'?title.slice(0,Math.ceil(title.length*Math.min(1,progress*2))):title;
      ctx.fillStyle='rgba(0,0,0,.36)';ctx.fillRect(0,canvas.height*.78,canvas.width,canvas.height*.22);ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.round(canvas.width*.055*scaleText)+'px '+textFont;if(textShadow){ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=10;}if(textOutline){ctx.strokeStyle='rgba(0,0,0,.85)';ctx.lineWidth=Math.max(2,canvas.width*.006);ctx.strokeText(text.slice(0,100),canvas.width/2,y,canvas.width*.86);}ctx.fillStyle=textColor;ctx.fillText(text.slice(0,100),canvas.width/2,y,canvas.width*.86);ctx.restore();}
  }
  async function exportVideo() {
    if(!clips.length){setNotice('Add at least one photo or video before exporting.');return;}
    if(requiredSlots && clips.length !== requiredSlots){setNotice('This template requires exactly '+requiredSlots+' media files. You have selected '+clips.length+'. Add or remove media before exporting.');return;}
    if(!canvasRef.current?.captureStream||!window.MediaRecorder){setNotice('Video export is not supported in this browser. Try the latest Chrome or Edge.');return;}
    cancelExportRef.current=false;setExportProgress(0);setExporting(true);setNotice('Rendering your template video… keep this tab open until export finishes.');
    try {
      const canvas=canvasRef.current,ctx=canvas.getContext('2d');
      const base=exportQuality==='1080p'?1080:720;canvas.width=aspect==='9:16'?base:aspect==='1:1'?base:Math.round(base*16/9);canvas.height=aspect==='9:16'?Math.round(base*16/9):aspect==='1:1'?base:base;
      const stream=canvas.captureStream(exportFps);
      let audioContext,sourceNode,mediaSource,audioEl;
      if(musicUrl){
        audioEl=new Audio(musicUrl);audioEl.loop=true;audioEl.volume=musicVolume;await audioEl.play();
        audioContext=new AudioContext();mediaSource=audioContext.createMediaElementSource(audioEl);sourceNode=audioContext.createMediaStreamDestination();mediaSource.connect(sourceNode);mediaSource.connect(audioContext.destination);
        sourceNode.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      }
      const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
      const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:exportQuality==='1080p'?10000000:6000000});
      const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('Recording failed'));});
      recorder.start(250);
      const start=performance.now();
      await new Promise(resolve=>{
        const frame=now=>{
          const elapsed=(now-start)/1000;setExportProgress(Math.min(99,Math.round(elapsed/totalDuration*100)));if(audioEl){const fadeIn=audioFadeIn>0?Math.min(1,elapsed/audioFadeIn):1;const fadeOut=audioFadeOut>0?Math.min(1,Math.max(0,(totalDuration-elapsed)/audioFadeOut)):1;audioEl.volume=Math.max(0,Math.min(1,musicVolume*fadeIn*fadeOut));}if(cancelExportRef.current){resolve();return;}const timing=frameTiming(elapsed,clips,beatSync,beatTimes);const index=timing.index;
          drawClip(ctx,canvas,clips[index],timing.progress,motion,filter,transition,index);
          if(elapsed<totalDuration)requestAnimationFrame(frame);else resolve();
        };requestAnimationFrame(frame);
      });
      recorder.stop();await done;
      if(cancelExportRef.current){stream.getTracks().forEach(t=>t.stop());if(audioEl){audioEl.pause();audioEl.currentTime=0;}if(audioContext)await audioContext.close();setExportProgress(0);setNotice('Export cancelled. Your project and original media are unchanged.');return;}
      setExportProgress(100);const webmBlob=new Blob(chunks,{type:'video/webm'});
      setNotice('Converting the rendered video to MP4. This can use substantial memory on phones; keep this tab open.');
      let finalBlob=webmBlob;
      try {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { toBlobURL } = await import('@ffmpeg/util');
        const ffmpeg = new FFmpeg();
        const coreBase = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        await ffmpeg.load({coreURL:await toBlobURL(coreBase+'/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL(coreBase+'/ffmpeg-core.wasm','application/wasm')});
        await ffmpeg.writeFile('vibepulse-input.webm',new Uint8Array(await webmBlob.arrayBuffer()));
        await ffmpeg.exec(['-i','vibepulse-input.webm','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-b:a','128k','vibepulse-output.mp4']);
        const data=await ffmpeg.readFile('vibepulse-output.mp4');
        finalBlob=new Blob([data.buffer],{type:'video/mp4'});
        await ffmpeg.deleteFile('vibepulse-input.webm'); await ffmpeg.deleteFile('vibepulse-output.mp4'); await ffmpeg.terminate();
      } catch (conversionError) {
        console.warn('MP4 conversion unavailable; preserving WebM export.',conversionError);
        setNotice('MP4 conversion was not available in this browser/network. A WebM file is ready instead.');
      }
      if(exportUrl)URL.revokeObjectURL(exportUrl);
      setExportUrl(URL.createObjectURL(finalBlob)); setExportMime(finalBlob.type || 'video/webm');
      try { const savedExport=await saveAutoCutExport(finalBlob,{name:(title||'vibepulse-autocut-video')});setSavedExports(await listAutoCutExports());setNotice('Export finished and saved to My Exports. Download or publish your video below.'); } catch { setNotice('Export finished. Browser storage could not keep a copy; use the download link now.'); }
      if(finalBlob.type==='video/mp4') setNotice('MP4 export finished. Download or publish your video below.');
      if(audioEl){audioEl.pause();audioEl.currentTime=0;}if(audioContext)await audioContext.close();
      stream.getTracks().forEach(t=>t.stop());
    } catch(e) { setNotice('Export failed: '+(e?.message||'Unknown browser error')); }
    finally {setExporting(false);}
  }

  const selectPreset = id => {setTemplateId(id);const p=PRESETS[id]||DEFAULT_PRESET;setFilter(p.filter);setMotion(p.motion);setClipDuration(p.duration);setTransition(p.transition);setRequiredSlots(0);setRequiredMediaMode('MIXED');setNotice(p.label+' preset applied. Add media or continue editing.');setExportUrl('');};
  async function publishVideo() {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!exportUrl) { setNotice('Export your video before publishing.'); return; }
    setPublishing(true); setNotice('Uploading video to VibePulse…');
    try {
      const blob = await (await fetch(exportUrl)).blob();
      const file = new File([blob], (title || 'vibepulse-template-video') + (blob.type === 'video/mp4' ? '.mp4' : '.webm'), {type:blob.type || 'video/webm'});
      const body = new FormData(); body.append('file', file);
      const {data:uploaded} = await api.post('/media/video-upload', body, {headers:{'Content-Type':'multipart/form-data'},timeout:180000});
      await api.post('/posts', {imageUrl:uploaded.url,mediaType:'VIDEO',caption:title.trim() || 'Made with VibePulse Templates',privacy:'PUBLIC'});
      setNotice('Video published to your VibePulse feed.');
      setTimeout(() => navigate('/?section=home'), 1200);
    } catch (e) { setNotice(e.response?.data?.error || 'Publishing failed. Check your login and video storage settings.'); }
    finally { setPublishing(false); }
  }
  async function autoCreate() {
    if(!clips.length){setNotice('Upload photos or videos first, then click Auto Create.');return;}
    if(requiredSlots&&clips.length!==requiredSlots){setNotice('This template requires exactly '+requiredSlots+' media files.');return;}
    const chosenStyle=autoStyle==='smart'?(music&&beatTimes.length>2?'beat':'cinematic'):autoStyle,plan=createAutoCutPlan(clips,chosenStyle,beatTimes,beatSync||(!!music&&beatTimes.length>2));
    setClips(plan);const style=AUTO_STYLES[chosenStyle]||AUTO_STYLES.smart;setMotion(style.motion[0]||'slowZoomIn');setTransition(style.transitions[0]||'fade');setFilter(FILTER_PRESETS[style.filters[0]]?.css||'none');setVisualEffect(style.effects[0]||'none');setEffectIntensity(45);setClipDuration(style.pacing);if(music&&beatTimes.length>2)setBeatSync(true);setExportUrl('');setExportMime('');setNotice('AutoCut created a '+style.label+' edit with '+plan.length+' clips. Preview and adjust before exporting.');
  }
  async function saveCurrentProject(){if(!clips.length){setNotice('Add media before saving a project.');return;}try{const project={name:(projectName||title||'My AutoCut Project').trim(),templateId,autoStyle,title,aspect,motion,filter,transition,visualEffect,effectIntensity,colorControls,textAnimation,textColor,textFont,textOutline,textShadow,motionSpeed,exportQuality,exportFps,clipDuration,beatSync,musicVolume,audioFadeIn,audioFadeOut,clips:clips.map(({url,...clip})=>clip),musicFile:music||null,musicRemoteUrl:music? '' : musicUrl};const saved=await saveAutoCutProject(project);setSavedProjects(await listAutoCutProjects());setNotice('Project and original media saved in this browser.');setProjectsOpen(false);}catch(e){setNotice('Could not save project. Browser storage may be full or unavailable: '+(e.message||''));}}
  async function openSavedProject(id){try{const project=await loadAutoCutProject(id);if(!project)throw new Error('Project not found');clips.forEach(c=>{if(c.url)URL.revokeObjectURL(c.url);});const restored=(project.clips||[]).filter(c=>c.file).map(c=>({...c,url:URL.createObjectURL(c.file)}));setClips(restored);setSelected(restored[0]?.id||'');setTemplateId(project.templateId||'cinematic-gold');setAutoStyle(project.autoStyle||'smart');setTitle(project.title||'');setAspect(project.aspect||'9:16');setMotion(project.motion||'zoom');setFilter(project.filter||'none');setTransition(project.transition||'fade');setVisualEffect(project.visualEffect||'none');setEffectIntensity(project.effectIntensity??45);setColorControls(project.colorControls||{exposure:0,brightness:0,contrast:0,saturation:0,temperature:0,tint:0});setTextAnimation(project.textAnimation||'fade');setTextColor(project.textColor||'#ffffff');setTextFont(project.textFont||'sans-serif');setTextOutline(project.textOutline??true);setTextShadow(project.textShadow??true);setMotionSpeed(project.motionSpeed||1);setExportQuality(project.exportQuality||'720p');setExportFps(project.exportFps||30);setClipDuration(project.clipDuration||2.5);setBeatSync(!!project.beatSync);setMusicVolume(project.musicVolume??.9);setAudioFadeIn(project.audioFadeIn??.5);setAudioFadeOut(project.audioFadeOut??.8);if(musicUrl&&!music)URL.revokeObjectURL(musicUrl);setMusic(project.musicFile||null);setMusicUrl(project.musicFile?URL.createObjectURL(project.musicFile):(project.musicRemoteUrl||''));setAudioWaveform([]);setBeatTimes([]);if(project.musicFile)detectBeatTimes(project.musicFile).then(a=>{setAudioWaveform(a.waveform||[]);setBeatTimes(a.beats||[]);}).catch(()=>{});setExportUrl('');setExportMime('');setProjectsOpen(false);setNotice('Project loaded. Check preview before exporting.');}catch(e){setNotice('Could not load project: '+(e.message||''));}}
  async function removeSavedProject(id){try{await deleteAutoCutProject(id);setSavedProjects(await listAutoCutProjects());setNotice('Project removed from this browser.');}catch{setNotice('Could not remove project.');}}
  async function downloadSavedExport(id){try{const item=await getAutoCutExport(id);if(!item?.blob)throw new Error('Export not found');const url=URL.createObjectURL(item.blob),a=document.createElement('a');a.href=url;a.download=item.name+(item.mimeType==='video/mp4'?'.mp4':'.webm');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){setNotice('Could not download saved export: '+(e.message||''));}}
  async function removeSavedExport(id){try{await deleteAutoCutExport(id);setSavedExports(await listAutoCutExports());setNotice('Export removed from this browser.');}catch{setNotice('Could not remove export.');}}
  function resetColorControls(){setColorControls({exposure:0,brightness:0,contrast:0,saturation:0,temperature:0,tint:0});setExportUrl('');}
  const templateOptions=Object.entries(PRESETS);
  return <main className="flex h-[100dvh] min-h-[640px] flex-col overflow-hidden bg-[#1e1e1e] text-[#d4d4d4] selection:bg-[#356a91]">
    <header className="z-30 flex min-h-9 shrink-0 items-center gap-3 border-b border-black bg-[#2b2b2b] px-3 text-[11px] shadow-md"><button onClick={()=>navigate('/templates')} className="flex items-center gap-1 border-r border-[#444] pr-3 text-[#ddd] hover:text-white"><ArrowLeft size={14}/> {tr('Templates','টেমপ্লেট')}</button><div className="flex items-center gap-2 font-semibold text-[#e6e6e6]"><Film size={15} className="text-[#83b9ef]"/> AutoCut Studio <span className="font-normal text-[#888]">/ {projectName || 'Untitled Project'}</span></div><div className="ml-auto flex items-center gap-2"><span className="hidden text-[10px] text-[#888] md:inline">Editing Workspace</span><button onClick={toggleLanguage} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] hover:bg-[#484848]">{bn?'English':'বাংলা'}</button></div></header>
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-hidden bg-[#111] p-px xl:grid-cols-[minmax(0,1fr)_320px]"><div className="col-span-1 flex flex-wrap items-center gap-1 border-b border-[#111] bg-[#252525] px-2 py-1.5 xl:col-span-2"><input aria-label="Project name" value={projectName} onChange={e=>setProjectName(e.target.value)} className="min-w-0 flex-1 border border-[#555] bg-[#1d1d1d] px-2 py-1 text-xs text-white" placeholder="Project name"/><button onClick={()=>{listAutoCutProjects().then(setSavedProjects).catch(()=>{});setProjectsOpen(true);}} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] hover:bg-[#484848]">My Projects ({savedProjects.length})</button><button onClick={()=>{listAutoCutExports().then(setSavedExports).catch(()=>{});setExportsOpen(true);}} className="border border-[#555] bg-[#383838] px-2 py-1 text-[10px] hover:bg-[#484848]">My Exports ({savedExports.length})</button></div>
      <section className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden bg-[#252525] p-2 xl:p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#454545] pb-2"><div><h1 className="text-base font-semibold tracking-wide text-[#eee]">{tr('Auto-create and edit videos','স্বয়ংক্রিয়ভাবে ভিডিও তৈরি ও সম্পাদনা করুন')}</h1><p className="mt-1 text-sm text-slate-400">{tr('Choose a style, add media, preview and export.','স্টাইল বেছে মিডিয়া যোগ করুন, প্রিভিউ দেখুন এবং ভিডিও এক্সপোর্ট করুন।')}</p></div><button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-2 border border-[#3977a8] bg-[#24669a] px-3 py-2 text-xs font-semibold hover:bg-[#2d79b4]"><ImagePlus size={17}/> {tr('Add photos/videos','ছবি/ভিডিও যোগ করুন')}</button><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple hidden onChange={e=>{addFiles(e.target.files);e.target.value='';}}/><input ref={replaceInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" hidden onChange={e=>{replaceClip(e.target.files?.[0]);e.target.value='';}}/></div>
        <div className="shrink-0 border border-[#454545] bg-[#222] p-2"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">{tr('Media Bin · imported clips','মিডিয়া বিন · যোগ করা ক্লিপ')} <span className="text-xs font-normal text-slate-400">({clips.length} clips · {formatTime(totalDuration)})</span></h2><div className="flex gap-2"><button onClick={undoEdit} disabled={!historyRef.current.past.length} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-30" title="Ctrl+Z">↶ Undo</button><button onClick={redoEdit} disabled={!historyRef.current.future.length} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-30" title="Ctrl+Y">↷ Redo</button><button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-1 text-sm text-violet-300"><Plus size={15}/> Add</button></div></div>{clips.length===0?<div className="rounded border border-dashed border-white/15 p-3 text-center text-xs text-slate-400">Choose photos or videos to build your template.</div>:<div className="flex gap-2 overflow-x-auto pb-1">{clips.map((c,i)=><div key={c.id} draggable onDragStart={e=>{setDragClipId(c.id);e.dataTransfer.setData('application/x-vibepulse-media',c.id);e.dataTransfer.effectAllowed='copy';}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=clips.findIndex(x=>x.id===dragClipId),to=clips.findIndex(x=>x.id===c.id);if(from>=0&&to>=0)reorderClip(from,to);setDragClipId('');}} onDragEnd={()=>setDragClipId('')} className={`w-24 shrink-0 rounded border p-1.5 ${selectedClip?.id===c.id?'border-violet-400 bg-violet-400/10':'border-white/10 bg-black/20'} ${dragClipId===c.id?'opacity-50':''}`}><button onClick={()=>setSelected(c.id)} className="w-full text-left"><div className="mb-1 aspect-video overflow-hidden rounded bg-[#111]">{c.type==='image'?<img src={c.url} alt="" className="h-full w-full object-cover"/>:<video src={c.url} muted className="h-full w-full object-cover"/>}</div><div className="truncate text-xs font-semibold">{i+1}. {c.name}</div><div className="mt-1 text-[11px] text-slate-400">{c.type} · {c.duration.toFixed(1)}s</div></button><div className="mt-2 flex flex-wrap justify-between gap-2"><button onClick={()=>moveClip(i,-1)} disabled={!i} className="text-xs text-slate-300 disabled:opacity-30">←</button><button onClick={()=>moveClip(i,1)} disabled={i===clips.length-1} className="text-xs text-slate-300 disabled:opacity-30">→</button><button onClick={()=>splitPhotoClip(c.id)} title="Split photo scene" className="text-xs text-amber-300">Split</button><button onClick={()=>duplicateClip(c.id)} title="Duplicate clip" className="text-xs text-sky-300">Copy</button><button onClick={()=>{setReplaceTarget(c.id);replaceInputRef.current?.click();}} className="text-xs text-violet-300">Replace</button><button onClick={()=>removeClip(c.id)} className="text-rose-300"><Trash2 size={14}/></button></div></div>)}</div>}</div>

        <div className="grid min-h-[190px] flex-1 grid-cols-1 gap-2 overflow-hidden md:grid-cols-[minmax(180px,0.36fr)_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden border border-[#454545] bg-[#171717]">
            <header className="flex items-center justify-between border-b border-[#454545] bg-[#292929] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300"><span>Source Monitor</span><span className="max-w-[55%] truncate font-normal normal-case text-slate-400">{selectedClip?.name || 'No source selected'}</span></header>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
              {!selectedClip ? <div className="text-center text-[11px] text-slate-500">Select a clip in the Media Bin to preview its source.</div> : selectedClip.type === 'image' ? <img src={selectedClip.url} alt={selectedClip.name} className="max-h-full max-w-full object-contain" /> : <video key={selectedClip.id + selectedClip.url} src={selectedClip.url} controls preload="metadata" className="max-h-full max-w-full bg-black" />}
            </div>
            {selectedClip && <footer className="border-t border-[#454545] bg-[#222] px-2 py-1 text-[10px] text-slate-400">{selectedClip.type.toUpperCase()} · {Number(selectedClip.duration || selectedClip.sourceDuration || 0).toFixed(2)}s · Source preview</footer>}
          </section>
          <section className="flex min-h-0 flex-col overflow-hidden border border-[#454545] bg-[#171717] shadow-inner">
            <header className="flex items-center justify-between border-b border-[#454545] bg-[#292929] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300"><span>Program Monitor</span><span className="font-normal normal-case text-slate-400">{aspect} · Timeline composition</span></header>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2"><canvas ref={canvasRef} width={540} height={960} className="max-h-full w-auto max-w-full bg-[#111] shadow-2xl" /></div>
          </section>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1"><button onClick={()=>setPlaying(v=>!v)} disabled={!clips.length} className="flex items-center gap-2 border border-[#555] bg-[#383838] px-3 py-2 text-xs font-semibold text-white hover:bg-[#484848] disabled:opacity-40">{playing?<Pause size={16}/>:<Play size={16}/>} {playing?tr('Pause preview','প্রিভিউ থামান'):tr('Preview video','ভিডিও প্রিভিউ')}</button><button onClick={()=>musicInputRef.current?.click()} className="flex items-center gap-2 border border-[#555] bg-[#383838] px-3 py-2 text-xs font-semibold hover:bg-[#484848]"><Music2 size={16}/> {music?tr('Change music','মিউজিক বদলান'):tr('Add music','মিউজিক যোগ করুন')}</button><input ref={musicInputRef} type="file" accept="audio/*" hidden onChange={e=>{chooseMusic(e.target.files?.[0]);e.target.value='';}}/><span className="flex items-center gap-1 text-xs text-slate-400"><Volume2 size={14}/>{music?music.name:(musicUrl?'Template music':'No music added')}</span>{(music||musicUrl)&&<><label className="flex items-center gap-2 text-xs text-slate-400">Volume <input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e=>setMusicVolume(Number(e.target.value))}/></label><label className="flex items-center gap-2 text-xs text-slate-400">Fade in <input aria-label="Audio fade in" type="range" min="0" max="3" step="0.1" value={audioFadeIn} onChange={e=>setAudioFadeIn(Number(e.target.value))}/>{audioFadeIn.toFixed(1)}s</label><label className="flex items-center gap-2 text-xs text-slate-400">Fade out <input aria-label="Audio fade out" type="range" min="0" max="3" step="0.1" value={audioFadeOut} onChange={e=>setAudioFadeOut(Number(e.target.value))}/>{audioFadeOut.toFixed(1)}s</label></>}</div>
        <div className="shrink-0 border border-[#454545] bg-[#222] p-2"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-slate-300">Music waveform analysis</span><span className="text-slate-500">{beatTimes.length>1?`${beatTimes.length-1} beat markers`:'No clear beat markers'}</span></div>{audioWaveform.length?<div className="flex h-14 items-center gap-[2px] overflow-hidden" role="img" aria-label="Analyzed audio waveform">{audioWaveform.map((v,i)=><span key={i} className="min-w-[2px] flex-1 rounded-sm bg-violet-400/80" style={{height:`${Math.max(6,v*100)}%`}}/> )}</div>:<p className="text-xs text-slate-500">Add a music file to analyze its waveform in this browser.</p>}{beatTimes.length>1&&<div className="mt-2 flex flex-wrap gap-1">{beatTimes.slice(0,24).map((t,i)=><span key={`${t}-${i}`} className="rounded bg-violet-400/10 px-1.5 py-1 text-[10px] text-violet-200">{t.toFixed(1)}s</span>)}</div>}</div>
        <div className="min-h-0 shrink-0"><VoiceTimeline mediaClips={clips} onNotice={setNotice} /></div>
      </section>
      <aside className="min-h-0 space-y-0 overflow-y-auto border-l border-[#111] bg-[#252525]">

        <div className="sticky top-0 z-20 grid grid-cols-3 border-b border-[#111] bg-[#292929] p-1">{[['edit','Edit'],['effects','Effects'],['export','Export']].map(([id,label])=><button key={id} type="button" onClick={()=>setInspectorTab(id)} className={"border px-2 py-2 text-[10px] font-semibold "+(inspectorTab===id?"border-sky-500 bg-sky-950 text-sky-100":"border-transparent text-slate-400 hover:bg-white/5")}>{label}</button>)}</div>
        {inspectorTab === 'edit' && <>        <div className="border-b border-[#454545] bg-[#303030] p-2.5"><h2 className="mb-2 flex items-center gap-2 font-black"><WandSparkles size={18} className="text-violet-300"/> AutoCut Studio</h2><p className="mb-3 text-xs leading-5 text-slate-400">Create a first edit from your media. Beat timing uses local audio peak analysis; AI scene and face detection are not simulated.</p><label className="mb-2 block text-xs text-slate-400">Editing style</label><select value={autoStyle} onChange={e=>setAutoStyle(e.target.value)} className="mb-3 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">{Object.entries(AUTO_STYLES).map(([id,style])=><option key={id} value={id}>{style.label}</option>)}</select><button onClick={autoCreate} disabled={!clips.length||exporting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 font-black disabled:opacity-40"><WandSparkles size={17}/> Auto Create</button><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={saveCurrentProject} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"><Save size={14}/> Save project</button><button onClick={resetColorControls} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"><RotateCcw size={14}/> Reset color</button></div></div>
        </>}
        {inspectorTab === 'edit' && <>        <div className="border-b border-[#454545] bg-[#303030] p-3"><h2 className="mb-3 flex items-center gap-2 font-black"><Sparkles size={17} className="text-violet-300"/> Template style</h2>{requiredSlots>0&&<p className="mb-3 rounded-lg bg-violet-400/10 p-2 text-xs text-violet-200">Required media: {requiredSlots} · Selected: {clips.length}</p>}<label className="mb-3 block text-xs text-slate-400">Preset</label><select value={templateId} onChange={e=>selectPreset(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">{!PRESETS[templateId]&&<option value={templateId}>{location.state?.templateTitle || 'Selected template'}</option>}{templateOptions.map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select><p className="mt-2 text-xs leading-5 text-slate-400">Every preset has its own starting look, motion, clip timing and transition.</p></div>
        </>}
        {inspectorTab === 'effects' && <>        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="mb-4 font-black">{tr('Edit video','ভিডিও এডিট')}</h2><label className="mb-2 block text-xs text-slate-400">Canvas ratio</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="9:16">9:16 TikTok / Reels / Shorts</option><option value="16:9">16:9 Landscape</option><option value="1:1">1:1 Square</option></select><label className="mb-2 block text-xs text-slate-400">Animation / motion</label><select value={motion} onChange={e=>{setMotion(e.target.value);setClips(old=>old.map(c=>({...c,motion:''})));setExportUrl('');}} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">{MOTION_OPTIONS.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select><label className="mb-2 block text-xs text-slate-400">Color grading preset</label><select value={filter} onChange={e=>{setFilter(e.target.value);setClips(old=>old.map(c=>({...c,filter:''})));setExportUrl('');}} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="none">Original</option>{Object.entries(FILTER_PRESETS).map(([key,item])=><option key={key} value={item.css}>{item.label}</option>)}</select><div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3"><div className="mb-2 flex items-center gap-2 text-sm font-bold"><SlidersHorizontal size={15}/> Color adjustments</div>{[['exposure','Exposure',-30,30],['brightness','Brightness',-30,30],['contrast','Contrast',-30,30],['saturation','Saturation',-50,50],['temperature','Temperature',-30,30],['tint','Tint',-20,20]].map(([key,label,min,max])=><label key={key} className="mb-2 block text-xs text-slate-400">{label}: {colorControls[key]}<input type="range" min={min} max={max} value={colorControls[key]} onChange={e=>{setColorControls(old=>({...old,[key]:Number(e.target.value)}));setExportUrl('');}} className="mt-1 w-full"/></label>)}</div><label className="mb-2 block text-xs text-slate-400">Visual effect</label><select value={visualEffect} onChange={e=>{setVisualEffect(e.target.value);setClips(old=>old.map(c=>({...c,effect:undefined,effectIntensity:undefined})));setExportUrl('');}} className="mb-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">{VFX_OPTIONS.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select><label className="mb-4 block text-xs text-slate-400">Effect intensity: {effectIntensity}%<input type="range" min="0" max="100" value={effectIntensity} onChange={e=>{setEffectIntensity(Number(e.target.value));setExportUrl('');}} className="mt-1 w-full"/></label><label className="mb-2 block text-xs text-slate-400">Motion speed: {motionSpeed.toFixed(1)}×</label><input type="range" min="0.4" max="2" step="0.1" value={motionSpeed} onChange={e=>{setMotionSpeed(Number(e.target.value));setExportUrl('');}} className="mb-4 w-full"/><label className="mb-2 block text-xs text-slate-400">Seconds per photo</label><input type="range" min=".5" max="5" step=".1" value={clipDuration} onChange={e=>{setClipDuration(Number(e.target.value));setClips(old=>old.map(c=>c.type==='image'?{...c,duration:Number(e.target.value)}:c));setExportUrl('');}} className="w-full"/><div className="mb-4 text-sm">{clipDuration.toFixed(1)} seconds</div><label className="mb-2 block text-xs text-slate-400">Transition</label><select value={transition} onChange={e=>{setTransition(e.target.value);setClips(old=>old.map(c=>({...c,transition:''})));setExportUrl('');}} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">{TRANSITION_OPTIONS.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select><label className="flex items-center gap-2 rounded-xl bg-black/20 p-3 text-sm"><input type="checkbox" checked={beatSync} onChange={e=>{setBeatSync(e.target.checked);setExportUrl('');}}/> Music Beat Sync (uses detected audio peaks)</label><label className="mt-4 block text-xs text-slate-400">Video title / Bangla or English text</label><input value={title} onChange={e=>{setTitle(e.target.value);setExportUrl('');}} placeholder="শিরোনাম / Add a title..." className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"/><label className="mt-3 block text-xs text-slate-400">Text animation</label><select value={textAnimation} onChange={e=>{setTextAnimation(e.target.value);setExportUrl('');}} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="fade">Fade</option><option value="slide">Slide</option><option value="pop">Pop</option><option value="typewriter">Typewriter</option><option value="bounce">Bounce</option><option value="neon">Neon / Glow</option><option value="none">Static</option></select><label className="mt-3 block text-xs text-slate-400">Text color<input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-slate-900"/></label><label className="mt-3 block text-xs text-slate-400">Text font<select value={textFont} onChange={e=>setTextFont(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="sans-serif">System Sans (Bangla fallback)</option><option value="serif">Serif</option><option value="monospace">Monospace</option><option value="Arial, sans-serif">Arial</option><option value="Noto Sans Bengali, sans-serif">Noto Sans Bengali (if installed)</option></select></label><div className="mt-3 flex gap-4 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={textOutline} onChange={e=>setTextOutline(e.target.checked)}/> Outline</label><label className="flex items-center gap-2"><input type="checkbox" checked={textShadow} onChange={e=>setTextShadow(e.target.checked)}/> Shadow</label></div></div>
        </>}
        {inspectorTab === 'export' && <>        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="mb-2 font-black">{tr('Export','এক্সপোর্ট')}</h2><div className="mb-3 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Resolution<select value={exportQuality} onChange={e=>setExportQuality(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-2.5 text-sm text-white"><option value="720p">720p · recommended</option><option value="1080p">1080p · more memory</option></select></label><label className="text-xs text-slate-400">Frame rate<select value={exportFps} onChange={e=>setExportFps(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-2.5 text-sm text-white"><option value={30}>30 FPS</option><option value={60}>60 FPS · heavier</option></select></label></div><p className="mb-3 text-xs leading-5 text-slate-400">Renders in your browser, then attempts MP4 conversion with FFmpeg WebAssembly. Large projects can be slow or run out of memory on phones.</p><button onClick={exportVideo} disabled={exporting||!clips.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 font-black disabled:opacity-50"><Download size={17}/>{exporting?tr('Rendering…','তৈরি হচ্ছে…'):tr('Export video','ভিডিও এক্সপোর্ট করুন')}</button>{exporting&&<div className="mt-3"><div className="mb-1 flex justify-between text-xs text-slate-400"><span>Rendering progress</span><span>{exportProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400 transition-all" style={{width:exportProgress+'%'}}/></div><button onClick={()=>{cancelExportRef.current=true;setNotice('Cancelling export…');}} className="mt-2 w-full rounded-lg border border-rose-400/30 px-3 py-2 text-sm text-rose-200">Cancel export</button></div>}{exportUrl&&<a href={exportUrl} download={(title||'vibepulse-template-video').replace(/[^a-z0-9-_]/gi,'-')+(exportMime==='video/mp4' ? '.mp4' : '.webm')} className="mt-3 block rounded-xl bg-emerald-500 px-4 py-3 text-center font-bold text-white">{tr('Download finished video','তৈরি হওয়া ভিডিও ডাউনলোড করুন')}</a>}{exportUrl&&<button onClick={publishVideo} disabled={publishing} className="mt-2 block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center font-bold text-white disabled:opacity-50">{publishing?tr('Publishing…','পোস্ট হচ্ছে…'):tr('Post to VibePulse','VibePulse-এ পোস্ট করুন')}</button>}</div>
        <div className="border-t border-[#454545] bg-[#242424] p-2 text-[11px] leading-4 text-[#bbb]">{notice}</div>
      </aside>
    </div>
    {projectsOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="My Projects"><section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-[#555] bg-[#242424] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">My Projects</h2><button onClick={()=>setProjectsOpen(false)} className="rounded-lg border border-white/10 px-3 py-2">Close</button></div>{savedProjects.length===0?<p className="text-sm text-slate-400">No saved projects in this browser yet. Save a project to keep the media and edit settings in local browser storage.</p>:<div className="space-y-2">{savedProjects.map(p=><article key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3"><div className="min-w-0 flex-1"><div className="truncate font-bold">{p.name}</div><div className="text-xs text-slate-400">{p.clipCount} clips · {new Date(p.updatedAt).toLocaleString()}</div></div><button onClick={()=>openSavedProject(p.id)} className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold">Open</button><button onClick={()=>removeSavedProject(p.id)} className="rounded-lg border border-rose-400/30 px-3 py-2 text-sm text-rose-200">Delete</button></article>)}</div>}</section></div>}
    {exportsOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="My Exports"><section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">My Exports</h2><button onClick={()=>setExportsOpen(false)} className="rounded-lg border border-white/10 px-3 py-2">Close</button></div>{savedExports.length===0?<p className="text-sm text-slate-400">Exports saved in this browser will appear here after rendering.</p>:<div className="space-y-2">{savedExports.map(x=><article key={x.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3"><div className="min-w-0 flex-1"><div className="truncate font-bold">{x.name}</div><div className="text-xs text-slate-400">{x.mimeType} · {(x.size/1024/1024).toFixed(1)} MB · {new Date(x.createdAt).toLocaleString()}</div></div><button onClick={()=>downloadSavedExport(x.id)} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold">Download</button><button onClick={()=>removeSavedExport(x.id)} className="rounded-lg border border-rose-400/30 px-3 py-2 text-sm text-rose-200">Delete</button></article>)}</div>}</section></div>}
    {selectedClip&&<div className="px-3 pb-3"><div className="grid gap-3 border border-[#454545] bg-[#303030] p-3 sm:grid-cols-3"><label className="text-xs text-slate-400">Selected clip motion<select value={selectedClip.motion||motion} onChange={e=>{const value=e.target.value;setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,motion:value}:c));setExportUrl('');}} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white">{MOTION_OPTIONS.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs text-slate-400">Selected clip transition<select value={selectedClip.transition||transition} onChange={e=>{const value=e.target.value;setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,transition:value}:c));setExportUrl('');}} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white">{TRANSITION_OPTIONS.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs text-slate-400">Selected clip VFX<select value={selectedClip.effect||visualEffect} onChange={e=>{const value=e.target.value;setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,effect:value,effectIntensity:value==='none'?0:effectIntensity/100}:c));setExportUrl('');}} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white">{VFX_OPTIONS.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs text-slate-400 sm:col-span-3">Selected clip effect intensity: {Math.round(Number(selectedClip.effectIntensity??effectIntensity/100)*100)}%<input aria-label="Selected clip effect intensity" type="range" min="0" max="100" value={Math.round(Number(selectedClip.effectIntensity??effectIntensity/100)*100)} onChange={e=>{const value=Number(e.target.value)/100;setClips(old=>old.map(c=>c.id===selectedClip.id?{...c,effectIntensity:value}:c));setExportUrl('');}} className="mt-2 w-full"/></label></div></div>}
    {selectedClip?.type==='video'&&<div className="mx-auto max-w-7xl px-4 pb-3"><div className="border border-[#454545] bg-[#303030] p-3"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-slate-200">Video trim · {selectedClip.name}</span><span className="text-slate-400">{Number(selectedClip.trimStart||0).toFixed(2)}s – {Number(selectedClip.trimEnd||selectedClip.sourceDuration||selectedClip.duration).toFixed(2)}s</span></div><label className="mb-1 block text-xs text-slate-400">Trim start</label><input aria-label="Video trim start" type="range" min="0" max={Math.max(.25,Number(selectedClip.sourceDuration||selectedClip.trimEnd||selectedClip.duration)-.25)} step=".05" value={Math.min(Number(selectedClip.trimStart||0),Math.max(0,Number(selectedClip.sourceDuration||selectedClip.trimEnd||selectedClip.duration)-.25))} onChange={e=>updateVideoTrim(selectedClip.id,'start',e.target.value)} className="mb-3 w-full"/><label className="mb-1 block text-xs text-slate-400">Trim end</label><input aria-label="Video trim end" type="range" min={Math.min(Number(selectedClip.sourceDuration||selectedClip.trimEnd||selectedClip.duration),Number(selectedClip.trimStart||0)+.25)} max={Math.max(.25,Number(selectedClip.sourceDuration||selectedClip.trimEnd||selectedClip.duration))} step=".05" value={Math.min(Number(selectedClip.trimEnd||selectedClip.sourceDuration||selectedClip.duration),Number(selectedClip.sourceDuration||selectedClip.trimEnd||selectedClip.duration))} onChange={e=>updateVideoTrim(selectedClip.id,'end',e.target.value)} className="w-full"/><label className="mt-3 block text-xs text-slate-400">Playback speed: {Number(selectedClip.speed||1).toFixed(2)}×<select aria-label="Video playback speed" value={selectedClip.speed||1} onChange={e=>updateVideoSpeed(selectedClip.id,e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm text-white">{[0.25,0.5,0.75,1,1.25,1.5,2,3,4].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><p className="mt-2 text-xs text-slate-500">Timeline duration: {Number(selectedClip.duration).toFixed(2)} seconds. Drag clips to reorder them.</p></div></div>}
  </main>;
}
