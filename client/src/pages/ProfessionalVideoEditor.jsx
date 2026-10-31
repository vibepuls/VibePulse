import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, AudioLines, Clapperboard, Download, Film, ImagePlus, Music2, Pause, Play, Plus, Scissors, Settings2, Sparkles, Trash2, Type, Undo2, Redo2, Volume2, WandSparkles } from 'lucide-react';

const id = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
const openEditorDB = () => new Promise((resolve, reject) => { if (!('indexedDB' in window)) return reject(new Error('Browser storage unavailable')); const req = indexedDB.open('vibepulse-studio-projects', 1); req.onupgradeneeded = () => req.result.createObjectStore('projects'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const fmt = (n) => { const v = Math.max(0, Number(n) || 0); return `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, '0')}`; };
const animations = [['None','none'],['Ken Burns — Zoom In','vp-ken-burns-in'],['Ken Burns — Zoom Out','vp-ken-burns-out'],['Ken Burns — Pan Left','vp-ken-burns-left'],['Ken Burns — Pan Right','vp-ken-burns-right'],['Ken Burns — Pan Up','vp-ken-burns-up'],['Ken Burns — Pan Down','vp-ken-burns-down'],['2.5D Parallax','vp-25d'],['Cinematic Push In','vp-push'],['Cinematic Pull Back','vp-zoom-out'],['Dynamic Drift','vp-drift-right'],['Soft Fade In','vp-fade']];
const visualEffects = [['None','none'],['Glow','vp-glow'],['VHS','vp-vhs'],['Dream Blur','vp-dream'],['Flash','vp-flash'],['Vintage','vp-vintage'],['Neon','vp-neon'],['Film Grain','vp-grain'],['Chromatic','vp-chromatic'],['Cinematic Contrast','vp-cinema'],['Soft Bloom','vp-bloom'],['Night Vision','vp-night'],['Retro Fade','vp-retro'],['Edge Pop','vp-edge'],['Glitch','vp-glitch'],['RGB Split','vp-rgb'],['Scanlines','vp-scanlines'],['Vignette','vp-vignette'],['Light Leak','vp-light-leak'],['Film Burn','vp-film-burn'],['Pixelate','vp-pixelate'],['Sharpen','vp-sharpen'],['Invert','vp-invert'],['Fade to Black','vp-fade-black'],['Comic Pop','vp-comic'],['Underwater','vp-underwater'],['Heatwave','vp-heatwave'],['Strobe','vp-strobe'],['Motion Blur','vp-motion-blur']];
const transitions = ['Cut','Fade','Dissolve','Zoom','Slide','Flash','Blur','Spin','Glitch','Whip Pan','Light Leak','RGB Split','Film Burn','Swipe Left','Swipe Right','Vertical Wipe','Zoom Blur','White Flash'];
const transitionAnimations = { Cut: 'none', Fade: 'vp-transition-fade', Dissolve: 'vp-transition-dissolve', Zoom: 'vp-transition-zoom', Slide: 'vp-transition-slide', Flash: 'vp-transition-flash', Blur: 'vp-transition-blur', Spin: 'vp-transition-spin', Glitch: 'vp-transition-glitch', 'Whip Pan': 'vp-transition-whip', 'Light Leak': 'vp-transition-light', 'RGB Split': 'vp-transition-rgb', 'Film Burn': 'vp-transition-burn', 'Swipe Left': 'vp-transition-swipe-left', 'Swipe Right': 'vp-transition-swipe-right', 'Vertical Wipe': 'vp-transition-wipe-y', 'Zoom Blur': 'vp-transition-zoom-blur', 'White Flash': 'vp-transition-white-flash' };
const filters = [
  ['Original','none'], ['Cinematic','contrast(1.12) saturate(.88) sepia(.12)'],
  ['Warm','saturate(1.12) sepia(.18)'], ['Cool','saturate(.92) hue-rotate(12deg)'],
  ['B&W','grayscale(1) contrast(1.12)'], ['Vivid','saturate(1.45) contrast(1.08)'], ['Dreamy','brightness(1.08) saturate(.9)']
];

export default function ProfessionalVideoEditor() {
  const location = useLocation();
  const templateLaunchRef = useRef(false);
  const [templateMode, setTemplateMode] = useState(false);
  const [clips, setClips] = useState([]);
  const [audio, setAudio] = useState(null);
  const [selected, setSelected] = useState(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [captions, setCaptions] = useState([]);
  const [captionDraft, setCaptionDraft] = useState('');
  const [aspect, setAspect] = useState('16:9');
  const [panel, setPanel] = useState('media');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [textSize, setTextSize] = useState(1);
  const [textY, setTextY] = useState(10);
  const [audioVolume, setAudioVolume] = useState(80);
  const [audioFadeIn, setAudioFadeIn] = useState(.5);
  const [audioFadeOut, setAudioFadeOut] = useState(.5);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const trimDragRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const timelineRef = useRef(null);
  const mediaRef = useRef(null);
  const audioRef = useRef(null);
  const active = clips.find(c => c.id === selected) || clips[0] || null;
  const duration = Math.max(1, clips.reduce((sum,c)=>sum+c.duration,0));
  const activeAtTime = useMemo(() => {
    let cursor = 0;
    for (const c of clips) { if (playhead < cursor + c.duration) return c; cursor += c.duration; }
    return clips[clips.length - 1] || null;
  }, [clips, playhead]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openEditorDB();
        const saved = await new Promise((resolve, reject) => { const tx = db.transaction('projects', 'readonly'); const req = tx.objectStore('projects').get('autosave'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
        if (cancelled) { db.close(); return; }
        if (saved) {
          const restored = (saved.clips || []).filter(c => c.file).map(c => ({ ...c, url: URL.createObjectURL(c.file) }));
          setClips(restored); setSelected(restored[0]?.id || null); setTitle(saved.title || ''); setCaptions(saved.captions || []); setAspect(saved.aspect || '16:9');
          setTextSize(saved.textSize || 1); setTextY(saved.textY ?? 10); setAudioVolume(saved.audioVolume ?? 80); setAudioFadeIn(saved.audioFadeIn ?? .5); setAudioFadeOut(saved.audioFadeOut ?? .5);
          if (saved.audio?.file) setAudio({ ...saved.audio, url: URL.createObjectURL(saved.audio.file) });
          if (restored.length) setNotice('Recovered your last autosaved project from this browser.');
        }
        db.close();
      } catch { /* browser storage may be unavailable */ }
      if (!cancelled) setAutosaveReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const launch = location.state;
    if (!autosaveReady || templateLaunchRef.current || !launch?.templateFiles?.length) return;
    templateLaunchRef.current = true;
    setTemplateMode(true);
    const templateId = launch.templateId || 'cinematic-gold';
    const presets = {
      'cinematic-gold': ['contrast(1.12) saturate(.88) sepia(.12)', 'vp-ken-burns-in', 'vp-cinema', 3.2],
      'love-moments': ['saturate(1.12) sepia(.12)', 'vp-ken-burns-out', 'vp-bloom', 2.5],
      'travel-diary': ['saturate(1.2) contrast(1.05)', 'vp-25d', 'vp-edge', 2.6],
      'birthday-recap': ['saturate(1.35) contrast(1.05)', 'vp-push', 'vp-glow', 1.8],
      'dark-attitude': ['grayscale(.25) contrast(1.3) brightness(.82)', 'vp-ken-burns-left', 'vp-chromatic', 1.7],
      'memories-sad': ['saturate(.75) hue-rotate(12deg) brightness(.9)', 'vp-ken-burns-down', 'vp-dream', 3],
      'photo-beat': ['saturate(1.3) contrast(1.1)', 'vp-ken-burns-in', 'vp-flash', 1.4],
      'reel-flash': ['saturate(1.35) contrast(1.15)', 'vp-drift-right', 'vp-flash', 1.3],
      'docu-story': ['contrast(1.1) saturate(.85)', 'vp-25d', 'vp-grain', 4],
      'city-lights': ['contrast(1.2) saturate(1.25) hue-rotate(8deg)', 'vp-ken-burns-right', 'vp-neon', 2.8],
      'summer-trip': ['saturate(1.25) brightness(1.04)', 'vp-ken-burns-up', 'vp-bloom', 2.2],
      'soft-love': ['saturate(1.12) sepia(.08)', 'vp-ken-burns-in', 'vp-bloom', 2.4],
      'minimal-story': ['contrast(1.08) saturate(.88)', 'vp-ken-burns-out', 'none', 3.5],
      'party-night': ['saturate(1.45) contrast(1.12)', 'vp-push', 'vp-glow', 1.5],
      'birthday-film': ['saturate(1.2) brightness(1.05)', 'vp-ken-burns-in', 'vp-bloom', 2.5],
      'slow-moments': ['saturate(.78) hue-rotate(10deg)', 'vp-ken-burns-down', 'vp-dream', 3.4],
      'gaming-highlight': ['contrast(1.25) saturate(1.45)', 'vp-glitch', 'vp-rgb', 1.4],
      'sports-hype': ['contrast(1.2) saturate(1.3)', 'vp-drift-right', 'vp-flash', 1.25],
      'fashion-editorial': ['contrast(1.08) saturate(.92)', 'vp-ken-burns-in', 'vp-bloom', 2.2],
      'food-reel': ['saturate(1.35) contrast(1.08) brightness(1.03)', 'vp-push', 'vp-glow', 1.6],
      'islamic-reflection': ['saturate(.82) sepia(.06) brightness(1.04)', 'vp-ken-burns-out', 'vp-bloom', 3.2],
      'news-explainer': ['contrast(1.18) saturate(.92)', 'vp-push', 'vp-cinema', 2.1],
      'business-story': ['contrast(1.08) saturate(.9)', 'vp-ken-burns-left', 'none', 2.6],
      'festival-vibes': ['saturate(1.4) contrast(1.12)', 'vp-drift-right', 'vp-glow', 1.4],
      'wedding-film': ['saturate(1.05) sepia(.08) brightness(1.04)', 'vp-ken-burns-in', 'vp-bloom', 2.8],
      'fitness-motivation': ['contrast(1.22) saturate(1.3)', 'vp-push', 'vp-flash', 1.3],
      'pet-moments': ['saturate(1.15) brightness(1.04)', 'vp-ken-burns-in', 'vp-bloom', 2.1],
      'nature-escape': ['saturate(1.08) contrast(1.04)', 'vp-ken-burns-out', 'vp-cinema', 3.0],
      'velocity-rush': ['contrast(1.25) saturate(1.4)', 'vp-drift-right', 'vp-chromatic', 1.2],
      'beat-drop': ['saturate(1.35) contrast(1.12)', 'vp-push', 'vp-flash', 1.35],
      'glow-up': ['brightness(1.08) saturate(1.2)', 'vp-ken-burns-in', 'vp-bloom', 2.3],
      'aesthetic-dream': ['brightness(1.06) saturate(.9) sepia(.06)', 'vp-ken-burns-out', 'vp-dream', 2.8],
      '3d-photo-depth': ['contrast(1.08) saturate(1.08)', 'vp-25d', 'vp-edge', 2.5],
      'meme-reaction': ['contrast(1.12) saturate(1.15)', 'vp-push', 'vp-glitch', 1.4],
      'makeup-transition': ['brightness(1.05) saturate(1.08)', 'vp-ken-burns-in', 'vp-bloom', 2.1],
      'couple-story': ['saturate(1.1) sepia(.1)', 'vp-ken-burns-out', 'vp-bloom', 2.7],
      'flash-fit-check': ['contrast(1.16) saturate(1.2)', 'vp-push', 'vp-flash', 1.25],
      'concert-hype': ['contrast(1.18) saturate(1.45)', 'vp-drift-right', 'vp-glow', 1.4],
      'mini-vlog': ['saturate(1.15) contrast(1.04)', 'vp-ken-burns-left', 'vp-edge', 2.0],
      'pet-comedy': ['saturate(1.2) brightness(1.05)', 'vp-push', 'vp-bloom', 1.7],
    };
    const preset = presets[templateId] || ['contrast(1.1) saturate(.95)', 'vp-ken-burns-in', 'vp-cinema', 2.5];
    const incoming = launch.templateFiles.filter(file => file && (file.type.startsWith('image/') || file.type.startsWith('video/'))).map((file, index) => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const clipDuration = type === 'video' ? Math.min(8, preset[3] * 2) : preset[3];
      return { id: id(), file, name: file.name || ((type === 'image' ? 'Photo ' : 'Video ') + (index + 1)), type, url: URL.createObjectURL(file), duration: clipDuration, trimStart: 0, trimEnd: clipDuration, filter: preset[0], speed: templateId === 'reel-flash' || templateId === 'party-night' ? 1.15 : 1, volume: 100, scale: 1, positionX: 0, positionY: 0, startScale: 1.02, endScale: templateId === 'dark-attitude' ? 1.18 : 1.12, animation: preset[1], effect: preset[2], transition: 'Cut', start: 0 };
    }).map((clip, index, all) => ({ ...clip, start: all.slice(0, index).reduce((sum, item) => sum + item.duration, 0) }));
    if (!incoming.length) { setNotice('Please choose photos or videos for this template.'); return; }
    setClips(incoming); setSelected(incoming[0].id); setAspect('9:16'); setTitle(''); setPanel('media'); setPlayhead(0); setPlaying(true);
    setNotice((launch.templateTitle || 'Template') + ' applied! Your media now has automatic motion, color grading and effects in a vertical 9:16 video. Add your own music if you want, then export.');
  }, [autosaveReady, location.key]);
  useEffect(() => {
    if (!autosaveReady) return;
    const timer = window.setTimeout(async () => {
      try {
        const db = await openEditorDB();
        const storedClips = clips.map(clip => { const copy = { ...clip }; delete copy.url; return copy; });
        const storedAudio = audio ? { ...audio } : null; if (storedAudio) delete storedAudio.url;
        const payload = { clips: storedClips, title, captions, aspect, textSize, textY, audioVolume, audioFadeIn, audioFadeOut, audio: storedAudio, savedAt: Date.now() };
        await new Promise((resolve, reject) => { const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(payload, 'autosave'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
        db.close();
      } catch { /* autosave is best-effort */ }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [autosaveReady, clips, title, captions, aspect, textSize, textY, audio, audioVolume, audioFadeIn, audioFadeOut]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPlayhead(p => p >= duration ? (setPlaying(false), duration) : p + .1), 100);
    return () => window.clearInterval(timer);
  }, [playing, duration]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || activeAtTime?.type !== 'video') return;
    const src = activeAtTime.url;
    if (el.src !== src) { el.src = src; el.currentTime = activeAtTime.trimStart || 0; }
    el.playbackRate = activeAtTime.speed || 1;
    el.volume = Math.max(0, Math.min(1, (activeAtTime.volume ?? 100) / 100));
    if (playing) el.play().catch(()=>{}); else el.pause();
  }, [activeAtTime, playing]);

  useEffect(() => () => {
    clips.forEach(c => URL.revokeObjectURL(c.url));
    if (audio?.url) URL.revokeObjectURL(audio.url);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
  // cleanup URLs on unmount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshot = () => {
    setHistory(h => [...h.slice(-29), { clips: clips.map(c=>({...c})), title, aspect }]);
    setRedo([]);
  };
  const importFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('video/') || f.type.startsWith('image/'));
    if (!files.length) { setNotice('Choose video or image files.'); return; }
    snapshot();
    const incoming = files.map(file => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      return { id:id(), file, name:file.name, type, url:URL.createObjectURL(file), duration:type==='video'?10:8, trimStart:0, trimEnd:type==='video'?10:8, filter:'none', speed:1, volume:100, scale:1, positionX:0, positionY:0, startScale:1.02, endScale:1.08, start:0 };
    });
    setClips(old => [...old, ...incoming]);
    setSelected(incoming[0].id); setNotice('Media added to the timeline. Select a clip to edit its settings.');
    if (exportUrl) { URL.revokeObjectURL(exportUrl); setExportUrl(''); }
  };
  const changeClip = (patch) => {
    if (!active) return;
    snapshot();
    setClips(old => old.map(c => c.id === active.id ? { ...c, ...patch } : c));
    if (exportUrl) { URL.revokeObjectURL(exportUrl); setExportUrl(''); }
  };
  const removeClip = (clipId) => {
    snapshot();
    const target = clips.find(c=>c.id===clipId);
    if (target) URL.revokeObjectURL(target.url);
    const next = clips.filter(c=>c.id!==clipId);
    setClips(next); setSelected(next[0]?.id || null);
    if (exportUrl) { URL.revokeObjectURL(exportUrl); setExportUrl(''); }
  };
  const moveClip = (index, step) => {
    const target=index+step; if(target<0||target>=clips.length) return;
    snapshot(); const next=[...clips]; [next[index],next[target]]=[next[target],next[index]];
    setClips(next); setSelected(next[target].id);
  };
  const splitAtPlayhead = () => {
    let cursor = 0; const index = clips.findIndex(c => { const match = playhead >= cursor && playhead < cursor + c.duration; cursor += c.duration; return match; });
    if (index < 0) { setNotice('Move the playhead inside a clip before splitting.'); return; }
    const clip = clips[index]; const start = clips.slice(0,index).reduce((sum,c)=>sum+c.duration,0); const at = playhead-start;
    if (at < .25 || clip.duration-at < .25) { setNotice('Move the playhead at least 0.25 seconds inside the clip.'); return; }
    snapshot();
    const left = {...clip,id:id(),duration:at}; const right = {...clip,id:id(),duration:clip.duration-at};
    if (clip.type === 'video') { const sourceStart=clip.trimStart||0; left.trimEnd=sourceStart+at*(clip.speed||1); right.trimStart=left.trimEnd; right.trimEnd=clip.trimEnd??sourceStart+clip.duration*(clip.speed||1); }
    setClips(old=>[...old.slice(0,index),left,right,...old.slice(index+1)]); setSelected(right.id); setNotice('Clip split at the playhead.');
  };
  const beginTrim = (event, clip, side) => {
    event.preventDefault(); event.stopPropagation(); snapshot();
    const drag={id:clip.id,side,x:event.clientX,duration:clip.duration,trimStart:clip.trimStart||0,trimEnd:clip.trimEnd??clip.duration};
    trimDragRef.current=drag;
    const onMove=(e)=>{const d=trimDragRef.current;if(!d)return;const delta=(e.clientX-d.x)/(25*timelineZoom);
      setClips(old=>old.map(item=>{if(item.id!==d.id)return item;
        if(d.side==='right'){const nextDuration=Math.max(.5,d.duration+delta);return item.type==='video'?{...item,duration:nextDuration,trimEnd:Math.max(d.trimStart+.1,d.trimEnd+delta*(item.speed||1))}:{...item,duration:nextDuration};}
        if(item.type!=='video')return {...item,duration:Math.max(.5,d.duration-delta)};
        const shift=Math.max(-d.trimStart,Math.min(d.duration-.5,delta));return {...item,trimStart:Math.max(0,d.trimStart+shift),duration:Math.max(.5,d.duration-shift)};
      }));
    };
    const onUp=()=>{trimDragRef.current=null;window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);};
    window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);
  };
  const applyAuto = () => {
    if (!clips.length) { setNotice('Import some video or images first, then run Auto Edit.'); return; }
    snapshot();
    const grades=['contrast(1.05) saturate(.94) sepia(.05)','saturate(1.04) sepia(.06)','saturate(1.08) contrast(1.02)','brightness(1.02) saturate(.96)','contrast(1.06) saturate(1.02)'];
    const motions=['vp-ken-burns-in','vp-ken-burns-left','vp-ken-burns-right','vp-ken-burns-out','vp-ken-burns-up','vp-ken-burns-down','vp-25d','vp-ken-burns-in','vp-ken-burns-left','vp-25d'];
    const fx=['vp-cinema','','vp-grain','',''];
    setClips(old=>old.map((clip,i)=>({...clip,filter:grades[i%grades.length],animation:motions[i%motions.length],effect:fx[i%fx.length],transition:'Cut',speed:clip.type==='video'?1:clip.speed})).map((clip,i)=>({...clip,start:old.slice(0,i).reduce((sum,x)=>sum+x.duration,0)})));
    setSelected(clips[0].id); setPlayhead(0); setPlaying(true);
    setNotice('Documentary Auto Edit applied: stronger, clearly visible Ken Burns / Parallax motion. All photo transitions are disabled (hard cuts only). Photos remain 8 seconds each. Preview is playing.');
  };
  const applyProAnimationPack = () => {
    if (!clips.length) { setNotice('Import media first to apply the animation pack.'); return; }
    snapshot();
    const pack=['vp-ken-burns-in','vp-ken-burns-left','vp-ken-burns-right','vp-ken-burns-out','vp-ken-burns-up','vp-ken-burns-down','vp-25d','vp-ken-burns-in','vp-ken-burns-left','vp-25d'];
    setClips(old=>old.map((clip,i)=>({...clip,animation:pack[i%pack.length],transition:'Cut'})));
    setNotice('Documentary Motion Pack applied: stronger Ken Burns / Parallax motion with no transitions between photos. Photos remain 8 seconds each. Note: exported video rendering may differ from editor preview.');
  };
  const undo = () => {
    if (!history.length) return;
    setRedo(r=>[...r,{clips:clips.map(c=>({...c})),title,aspect}]);
    const prev=history[history.length-1]; setHistory(h=>h.slice(0,-1));
    setClips(prev.clips); setTitle(prev.title); setAspect(prev.aspect); setSelected(prev.clips[0]?.id||null);
  };
  const redoEdit = () => {
    if (!redo.length) return;
    setHistory(h=>[...h,{clips:clips.map(c=>({...c})),title,aspect}]);
    const next=redo[redo.length-1]; setRedo(r=>r.slice(0,-1));
    setClips(next.clips); setTitle(next.title); setAspect(next.aspect); setSelected(next.clips[0]?.id||null);
  };
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || event.target?.isContentEditable) return;
      if (event.code === 'Space') { event.preventDefault(); setPlaying(value => !value); }
      else if (event.key.toLowerCase() === 'c') { event.preventDefault(); splitAtPlayhead(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && event.shiftKey) { event.preventDefault(); redoEdit(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
      else if (event.key === 'Delete' && selected) removeClip(selected);
      else if (event.key === 'ArrowLeft') setPlayhead(p => Math.max(0, p - 1 / 30));
      else if (event.key === 'ArrowRight') setPlayhead(p => Math.min(duration, p + 1 / 30));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
  const handleMediaDrop = (event) => { event.preventDefault(); const files=event.dataTransfer?.files; if(files?.length) importFiles(files); };
  const seekTimeline = (event) => {
    const rect=timelineRef.current?.getBoundingClientRect(); if(!rect) return;
    setPlayhead(Math.max(0,Math.min(duration,((event.clientX-rect.left)/rect.width)*duration)));
  };
  const motionDuration = activeAtTime ? Math.max(8, activeAtTime.duration || 8) : 8;
  const previewAnimation = activeAtTime?.animation && activeAtTime.animation !== 'none' ? `${activeAtTime.animation} ${motionDuration}s linear 1 both` : 'none';
  const backgroundMotion = activeAtTime?.animation === 'vp-25d' ? `vp-25d-background ${motionDuration}s linear 1 both` : activeAtTime?.animation?.startsWith('vp-ken-burns') ? `vp-ken-burns-background ${motionDuration}s linear 1 both` : 'none';
  const transitionName = 'Cut';
  const transitionDuration = transitionName === 'Cut' ? 0 : transitionName === 'Fade' ? 420 : transitionName === 'Dissolve' ? 620 : transitionName === 'Zoom' ? 560 : transitionName === 'Slide' ? 520 : 360;
  const previewTransitionAnimation = transitionName !== 'Cut' && transitionAnimations[transitionName] ? `${transitionAnimations[transitionName]} ${transitionDuration}ms cubic-bezier(.22,.61,.36,1) 1 both` : 'none';
  const effectClass = activeAtTime?.effect && activeAtTime.effect !== 'none' ? activeAtTime.effect : '';
  const addCaption = () => {
    const text = captionDraft.trim();
    if (!text) { setNotice('Type a caption before adding it.'); return; }
    const caption = { id:id(), text, start:Math.max(0,playhead), duration:3 };
    setCaptions(old=>[...old,caption].sort((a,b)=>a.start-b.start));
    setCaptionDraft('');
    setNotice('Caption added at '+fmt(playhead)+'. Adjust its start and duration in the Text panel.');
  };
  const setAudioFile = (file) => {
    if (!file) return;
    if (audio?.url) URL.revokeObjectURL(audio.url);
    setAudio({file,url:URL.createObjectURL(file),name:file.name});
    setNotice('Audio added. Use the audio track below to see it in your edit.');
  };
  const syncPhotosToBeat = async () => {
    if (!audio?.file) { setNotice('Import a music track first, then use Beat Sync.'); return; }
    const photos=clips.filter(c=>c.type==='image');
    if (photos.length<2) { setNotice('Beat Sync needs at least two photo clips. Add more photos first.'); return; }
    setNotice('Analyzing the music rhythm…');
    let audioContext;
    try {
      audioContext=new AudioContext();
      const decoded=await audioContext.decodeAudioData(await audio.file.arrayBuffer());
      const data=decoded.getChannelData(0);
      const sampleRate=decoded.sampleRate;
      const hop=Math.max(256,Math.floor(sampleRate*.05));
      const energy=[];
      for(let i=0;i<data.length;i+=hop){let sum=0;const end=Math.min(data.length,i+hop);for(let j=i;j<end;j+=4)sum+=data[j]*data[j];energy.push(Math.sqrt(sum/Math.max(1,Math.ceil((end-i)/4))));}
      const average=energy.reduce((a,b)=>a+b,0)/Math.max(1,energy.length);
      const peaks=[];
      for(let i=2;i<energy.length-2;i++){if(energy[i]>average*1.35&&energy[i]>=energy[i-1]&&energy[i]>energy[i+1]&&(peaks.length===0||i-peaks[peaks.length-1]>=3))peaks.push(i);}
      const gaps=peaks.slice(1).map((p,i)=>(p-peaks[i])*.05).filter(g=>g>=.25&&g<=1.2).sort((a,b)=>a-b);
      const beat=gaps.length?gaps[Math.floor(gaps.length/2)]:.5;
      const beatLength=Math.max(.35,Math.min(1.2,beat*2));
      snapshot();
      let cursor=0;
      setClips(old=>old.map(clip=>{const next=clip.type==='image'?{...clip,duration:beatLength,trimEnd:beatLength,transition:'Flash'}:clip;const result={...next,start:cursor};cursor+=next.duration;return result;}));
      setSelected(photos[0].id);setPlayhead(0);setPlaying(true);
      setNotice('Beat Sync applied using detected music peaks. Photo cuts are aligned to an estimated rhythm ('+beatLength.toFixed(2)+' seconds per photo); check the preview and adjust if needed.');
    } catch(error) {
      setNotice('Could not analyze this audio file. Try a common MP3, WAV, or M4A file. '+(error?.message||''));
    } finally { if(audioContext&&audioContext.state!=='closed')await audioContext.close(); }
  };

  const exportVideo = async () => {
    setNotice('');
    if (!clips.length) { setNotice('Import a video or image first.'); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      setNotice('Export is not supported by this browser. Try the latest Chrome or Edge.'); return;
    }
    setExporting(true);
    try {
      const canvas=document.createElement('canvas');
      // Use a mobile-friendly render size to reduce dropped frames while encoding in-browser.
      const [w,h]=aspect==='9:16'?[540,960]:aspect==='1:1'?[720,720]:[960,540];
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      const loaded=await Promise.all(clips.map(c=>new Promise((resolve,reject)=>{
        if(c.type==='image'){const img=new Image();img.onload=()=>resolve({c,media:img,width:img.naturalWidth,height:img.naturalHeight});img.onerror=reject;img.src=c.url;return;}
        const video=document.createElement('video');video.src=c.url;video.muted=true;video.playsInline=true;video.preload='auto';
        const ready=()=>{video.playbackRate=c.speed||1;video.play().catch(()=>{});resolve({c,media:video,width:video.videoWidth||1280,height:video.videoHeight||720});};
        video.addEventListener('loadedmetadata',ready,{once:true});video.addEventListener('error',reject,{once:true});video.load();
      })));
      // 24 fps is more reliable on phones during simultaneous drawing and MP4 encoding.
      const renderFps=24;
      // Manual frame capture keeps the MediaRecorder timestamps tied to the editor's
      // wall-clock timeline instead of browser-dependent captureStream frame pacing.
      const stream=canvas.captureStream(0);
      const canvasTrack=stream.getVideoTracks()[0];
      const requestCanvasFrame=typeof canvasTrack.requestFrame==='function'?()=>canvasTrack.requestFrame():()=>{};
      let audioCtx=null, audioEl=null, audioGain=null;
      if(audio?.url){
        audioCtx=new AudioContext(); audioEl=new Audio(audio.url); audioEl.loop=true;
        const src=audioCtx.createMediaElementSource(audioEl); const gain=audioCtx.createGain(); audioGain=gain; const dest=audioCtx.createMediaStreamDestination();
        const targetVolume=Math.max(0,Math.min(1,audioVolume/100)); gain.gain.setValueAtTime(audioFadeIn>0?0:targetVolume,audioCtx.currentTime); if(audioFadeIn>0)gain.gain.linearRampToValueAtTime(targetVolume,audioCtx.currentTime+audioFadeIn); src.connect(gain); gain.connect(dest); dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t)); await audioCtx.resume(); await audioEl.play().catch(()=>{});
      }
      // Always record a browser-native WebM intermediate, then encode a real H.264/AAC MP4.
      // Some browsers report MP4 support but emit files whose container/codec Premiere Pro rejects.
      const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
      if(!mime) throw new Error('This browser cannot record a supported WebM intermediate. Please use the latest Chrome or Edge.');
      const recorder=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond:8000000}); const chunks=[];
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      const stopped=new Promise(resolve=>recorder.onstop=resolve); recorder.start(250);
      const total=clips.reduce((s,c)=>s+c.duration,0); if(audioCtx&&audioGain&&audioFadeOut>0&&audioFadeOut<total){audioGain.gain.setValueAtTime(Math.max(0,Math.min(1,audioVolume/100)),audioCtx.currentTime+Math.max(0,total-audioFadeOut));audioGain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+total);} const start=performance.now(); let frameNumber=0;
      await new Promise(resolve=>{
        const draw=()=>{
          const now=performance.now();
          const t=Math.min(total,(now-start)/1000); let offset=0; let item=loaded[loaded.length-1];
          for(const candidate of loaded){if(t<offset+candidate.c.duration){item=candidate;break;}offset+=candidate.c.duration;}
          ctx.fillStyle='#050711';ctx.fillRect(0,0,w,h);
          const progress=Math.min(1,(t-offset)/item.c.duration);
          // Keep motion running for the entire clip. Previously it reached its final scale
          // after 25% of the clip, making the exported video look frozen for the rest.
          const motionProgress=progress<.25?(16*progress-16*progress*progress)/9:(8*progress+1)/9;
          const animation=item.c.animation||'none';
          let fromScale=item.c.startScale||1.02, toScale=item.c.endScale||1.08;
          if(animation==='vp-ken-burns-in'){fromScale=1.02;toScale=1.20;}
          else if(animation==='vp-ken-burns-out'){fromScale=1.20;toScale=1.03;}
          else if(animation==='vp-ken-burns-left'||animation==='vp-ken-burns-right'||animation==='vp-ken-burns-up'||animation==='vp-ken-burns-down'){fromScale=1.16;toScale=1.16;}
          else if(animation==='vp-25d'){fromScale=1.05;toScale=1.22;}
          else if(animation==='vp-push'){fromScale=1.01;toScale=1.10;}
          else if(animation==='vp-zoom-out'){fromScale=1.20;toScale=1.03;}
          const keyScale=fromScale+(toScale-fromScale)*motionProgress;
          const scale=Math.max(w/item.width,h/item.height)*keyScale*(item.c.scale||1);
          let moveX=(item.c.positionX||0), moveY=(item.c.positionY||0);
          if(animation==='vp-ken-burns-left')moveX+=6-12*motionProgress;
          else if(animation==='vp-ken-burns-right')moveX+=-4+8*motionProgress;
          else if(animation==='vp-ken-burns-up')moveY+=6-12*motionProgress;
          else if(animation==='vp-ken-burns-down')moveY+=-4+8*motionProgress;
          else if(animation==='vp-25d'){moveX+=3-7*motionProgress;moveY+=1.2-3.2*motionProgress;}
          else if(animation==='vp-drift-right')moveX+=-4.5+9*motionProgress;
          const dw=item.width*scale,dh=item.height*scale;
          if(item.c.type==='video'){
            const sourceTime=(item.c.trimStart||0)+Math.max(0,t-offset)*(item.c.speed||1);
            const sourceEnd=item.c.trimEnd;
            if(Number.isFinite(sourceEnd)&&sourceTime>=sourceEnd){item.media.currentTime=Math.max(item.c.trimStart||0,sourceEnd-.04);}
            else if(Math.abs(item.media.currentTime-sourceTime)>.75){try{item.media.currentTime=Math.min(sourceEnd||sourceTime,sourceTime);}catch{}}
          }
          const transition=item.c.transition||'Cut';
          const transitionWindow=Math.min(.42,item.c.duration*.3);
          const transitionProgress=transitionWindow>0?Math.min(1,Math.max(0,(t-offset)/transitionWindow)):1;
          ctx.save();
          if(transition==='Fade'||transition==='Dissolve')ctx.globalAlpha=transitionProgress;
          if(transition==='Flash'||transition==='White Flash')ctx.filter=(item.c.filter||'none')+' brightness('+(1+(1-transitionProgress)*1.8)+')';
          else ctx.filter=item.c.filter||'none';
          if(transition==='Zoom'||transition==='Zoom Blur') { const z=1+(1-transitionProgress)*.14; ctx.translate(w/2,h/2);ctx.scale(z,z);ctx.translate(-w/2,-h/2); }
          if(transition==='Slide'||transition==='Swipe Left')moveX+=((1-transitionProgress)*-100);
          if(transition==='Swipe Right')moveX+=(1-transitionProgress)*100;
          if(transition==='Vertical Wipe') { ctx.beginPath();ctx.rect(0,0,w,h*transitionProgress);ctx.clip(); }
          try{ctx.drawImage(item.media,(w-dw)/2+moveX*w/100,(h-dh)/2+moveY*h/100,dw,dh);}catch{}ctx.restore();
          const fx=item.c.effect||'none';
          if(fx==='vp-vignette'||fx==='vp-cinema'){const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,fx==='vp-cinema'?'rgba(0,0,0,.38)':'rgba(0,0,0,.62)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);}
          if(fx==='vp-scanlines'||fx==='vp-vhs'){ctx.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);}
          if(fx==='vp-rgb'||fx==='vp-chromatic'){ctx.globalAlpha=.12;ctx.globalCompositeOperation='screen';ctx.drawImage(canvas,3,0,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
          if(fx==='vp-glitch'&&Math.random()>.86){const gy=Math.random()*h;ctx.drawImage(canvas,Math.random()*12-6,gy,w,h*.035,0,gy,w,h*.035);}
          if(fx==='vp-film-burn'||fx==='vp-light-leak'){const lg=ctx.createLinearGradient(0,0,w,h);lg.addColorStop(0,'rgba(255,90,20,'+(fx==='vp-film-burn'?.32:.2)+')');lg.addColorStop(.45,'rgba(255,170,50,.03)');lg.addColorStop(1,'rgba(255,30,120,.15)');ctx.fillStyle=lg;ctx.fillRect(0,0,w,h);}
          if(fx==='vp-invert'){ctx.save();ctx.globalCompositeOperation='difference';ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.restore();}
          if(fx==='vp-strobe'&&Math.floor(t*12)%2===0){ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(0,0,w,h);}
          if(fx==='vp-glow'||fx==='vp-bloom'){ctx.fillStyle='rgba(255,220,245,.05)';ctx.fillRect(0,0,w,h);}
          const grad=ctx.createLinearGradient(0,h*.5,0,h);grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,.65)');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
          if(title){ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=12;ctx.shadowOffsetY=3;ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold '+Math.round(w*.045*textSize)+'px Arial';ctx.fillText(title,w/2,h*(1-textY/100),w*.85);ctx.restore();}
          const activeCaption=captions.find(c=>t>=c.start&&t<c.start+c.duration);
          if(activeCaption?.text){ctx.save();const fontSize=Math.round(w*.045);ctx.font='bold '+fontSize+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';const words=activeCaption.text.split(/\\s+/);const lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>w*.86&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);const lineHeight=fontSize*1.2;const boxHeight=lines.length*lineHeight+fontSize*.8;const cy=h*.82;ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(w*.06,cy-boxHeight/2,w*.88,boxHeight);ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=3;lines.forEach((line,i)=>ctx.fillText(line,w/2,cy-(lines.length-1)*lineHeight/2+i*lineHeight,w*.84));ctx.restore();}
          requestCanvasFrame();
          frameNumber++;
          if(t>=total){resolve();return;}
          // Schedule against absolute elapsed time to avoid accumulating frame delays.
          const nextDue=start+frameNumber*(1000/renderFps);
          window.setTimeout(draw,Math.max(0,nextDue-performance.now()));
        };
        requestCanvasFrame();
        draw();
      });
      recorder.stop(); await stopped; stream.getTracks().forEach(t=>t.stop());
      if(audioEl)audioEl.pause(); if(audioCtx)await audioCtx.close();
      const recordedType=recorder.mimeType||mime||'video/webm';
      const recordedBlob=new Blob(chunks,{type:recordedType});
      if(audioEl)audioEl.pause(); if(audioCtx&&audioCtx.state!=='closed')await audioCtx.close();
      setNotice('এই ব্রাউজারে সরাসরি MP4 রেকর্ডিং নেই। এখন MP4 কনভার্ট করার চেষ্টা করছি…');
      // Convert the browser-recorded WebM to a widely compatible H.264/AAC MP4.
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({message}) => {
        if (/error|failed|invalid/i.test(message||'')) setNotice('MP4 encoder: '+message.slice(0,180));
      });
      ffmpeg.on('progress', ({progress}) => {
        const pct=Math.max(0,Math.min(100,Math.round((progress||0)*100)));
        setNotice('MP4 render চলছে… '+pct+'%');
      });
      setNotice('MP4 encoder লোড হচ্ছে… প্রথমবার কিছুটা সময় লাগতে পারে।');
      // Use a matching, stable FFmpeg core release and retry a second CDN if needed.
      const coreBases=[
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      ];
      let coreLoaded=false, coreError=null;
      for(const coreBase of coreBases){
        try{
          const [coreResponse,wasmResponse]=await Promise.all([
            fetch(coreBase+'/ffmpeg-core.js',{cache:'force-cache'}),
            fetch(coreBase+'/ffmpeg-core.wasm',{cache:'force-cache'})
          ]);
          if(!coreResponse.ok||!wasmResponse.ok)throw new Error('FFmpeg core CDN returned '+coreResponse.status+'/'+wasmResponse.status);
          const [coreCode,wasmBytes]=await Promise.all([coreResponse.text(),wasmResponse.arrayBuffer()]);
          const coreURL=URL.createObjectURL(new Blob([coreCode],{type:'text/javascript'}));
          const wasmURL=URL.createObjectURL(new Blob([wasmBytes],{type:'application/wasm'}));
          await ffmpeg.load({coreURL,wasmURL});
          URL.revokeObjectURL(coreURL);URL.revokeObjectURL(wasmURL);
          coreLoaded=true;break;
        }catch(err){coreError=err;console.warn('FFmpeg core CDN failed:',coreBase,err);}
      }
      if(!coreLoaded)throw new Error('FFmpeg encoder could not load from either CDN. Check internet/ad-blocker and reload. '+(coreError?.message||''));
      const inputName='vibepulse-input.webm', outputName='vibepulse-studio.mp4';
      setNotice('ভিডিও MP4-এ কনভার্ট হচ্ছে…');
      await ffmpeg.writeFile(inputName,new Uint8Array(await recordedBlob.arrayBuffer()));
      // Normalize the encoded duration to the editor timeline. Some browsers write
      // short WebM timestamps even when recording ran for the full requested duration.
      const probeUrl=URL.createObjectURL(recordedBlob);
      const sourceDuration=await new Promise(resolve=>{
        const probe=document.createElement('video');probe.preload='metadata';probe.onloadedmetadata=()=>{const d=probe.duration;URL.revokeObjectURL(probeUrl);resolve(Number.isFinite(d)&&d>0?d:total);};probe.onerror=()=>{URL.revokeObjectURL(probeUrl);resolve(total);};probe.src=probeUrl;
      });
      const stretch=Math.max(0.1,Math.min(10,total/sourceDuration));
      await ffmpeg.exec(['-i',inputName,'-map','0:v:0','-map','0:a?','-vf',`setpts=${stretch}*PTS,fps=24`,'-t',String(total),'-r','24','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-ar','48000','-b:a','160k',outputName]);
      const mp4Data=await ffmpeg.readFile(outputName);
      const mp4Blob=new Blob([mp4Data],{type:'video/mp4'});
      if(exportUrl)URL.revokeObjectURL(exportUrl);
      setExportUrl(URL.createObjectURL(mp4Blob)); setNotice('MP4 render complete (H.264 video + AAC audio). Your video is ready for Premiere Pro; imported music is included.');
      ffmpeg.terminate();
    } catch(e){console.error('VibePulse MP4 export failed:',e);setNotice('রেন্ডার ব্যর্থ: '+(e?.message||String(e)||'Unknown error')+'. Chrome-এ আবার চেষ্টা করুন; সমস্যা থাকলে এই error message-টি পাঠান।');}
    finally{setExporting(false);}
  };

  const button = (label, icon, onClick, activeState=false) => <button key={label} onClick={onClick} title={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${activeState?'bg-violet-500/25 text-violet-200':'text-slate-300 hover:bg-white/10'}`}>{icon}<span>{label}</span></button>;
  return <div className="min-h-screen bg-[#090b12] text-slate-100">
    <style>{`@keyframes vp-zoom{from{transform:scale(1)}to{transform:scale(1.04)}}@keyframes vp-ken-burns-in{0%{transform:scale(1.02)}100%{transform:scale(1.20)}}@keyframes vp-ken-burns-out{0%{transform:scale(1.20)}100%{transform:scale(1.03)}}@keyframes vp-ken-burns-left{0%{transform:scale(1.16) translateX(6%)}100%{transform:scale(1.16) translateX(-6%)}}@keyframes vp-ken-burns-right{0%{transform:scale(1.12) translateX(-4%)}100%{transform:scale(1.12) translateX(4%)}}@keyframes vp-ken-burns-up{0%{transform:scale(1.16) translateY(6%)}100%{transform:scale(1.16) translateY(-6%)}}@keyframes vp-ken-burns-down{0%{transform:scale(1.12) translateY(-4%)}100%{transform:scale(1.12) translateY(4%)}}@keyframes vp-25d{0%{transform:perspective(1000px) scale(1.05) translate3d(3%,1.2%,0) rotateY(-1.6deg)}50%{transform:perspective(1000px) scale(1.15) translate3d(-3%,-1.6%,0) rotateY(2deg)}100%{transform:perspective(1000px) scale(1.22) translate3d(-4%,1.2%,0) rotateY(1.6deg)}}@keyframes vp-25d-background{0%{transform:scale(1.14) translate3d(-3%,0,0)}50%{transform:scale(1.20) translate3d(3%,2%,0)}100%{transform:scale(1.16) translate3d(4%,-1%,0)}}@keyframes vp-ken-burns-background{0%{transform:scale(1.14) translate3d(3%,0,0)}100%{transform:scale(1.20) translate3d(-3%,0,0)}}@keyframes vp-zoom-out{from{transform:scale(1.035)}to{transform:scale(1.015)}}@keyframes vp-fade{from{opacity:.15}to{opacity:1}}@keyframes vp-ken-burns{0%{transform:scale(1.02) translate(0,0)}100%{transform:scale(1.04) translate(-2%,1%)}}@keyframes vp-float{0%,100%{transform:scale(1.02) translateY(0)}50%{transform:scale(1.055) translateY(-1%)}}@keyframes vp-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}@keyframes vp-flash{0%,100%{opacity:1}50%{opacity:.72}}@keyframes vp-bounce{0%{transform:translateY(10%) scale(.92);opacity:.4}60%{transform:translateY(-2%) scale(1.02);opacity:1}100%{transform:translateY(0) scale(1)}}@keyframes vp-rotate-in{from{transform:rotate(-7deg) scale(.88);opacity:0}to{transform:rotate(0) scale(1);opacity:1}}@keyframes vp-pop{0%{transform:scale(.72);opacity:0}70%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}@keyframes vp-push{from{transform:scale(1.01)}to{transform:scale(1.035)}}@keyframes vp-drift-right{from{transform:scale(1.16) translateX(-4.5%)}to{transform:scale(1.16) translateX(4.5%)}}@keyframes vp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}@keyframes vp-swing{0%,100%{transform:rotate(0)}25%{transform:rotate(1deg)}75%{transform:rotate(-1deg)}}@keyframes vp-blur-reveal{from{filter:blur(12px);opacity:.3;transform:scale(1.04)}to{filter:blur(0);opacity:1;transform:scale(1)}}@keyframes vp-glitch{0%,92%,100%{transform:translate(0)}93%{transform:translate(-3px,1px)}96%{transform:translate(3px,-1px)}}@keyframes vp-transition-fade{from{opacity:0}to{opacity:1}}@keyframes vp-transition-dissolve{0%{opacity:0;filter:blur(8px)}100%{opacity:1;filter:blur(0)}}@keyframes vp-transition-zoom{0%{opacity:0;transform:scale(1.035)}100%{opacity:1;transform:scale(1)}}@keyframes vp-transition-slide{0%{opacity:.2;transform:translateX(9%)}100%{opacity:1;transform:translateX(0)}}@keyframes vp-transition-flash{0%{opacity:0;filter:brightness(2.4)}35%{opacity:1;filter:brightness(1.5)}100%{opacity:1;filter:brightness(1)}}.vp-glow{filter:brightness(1.08) saturate(1.2) drop-shadow(0 0 16px rgba(167,139,250,.55))}.vp-vhs{filter:contrast(1.2) saturate(1.25) sepia(.12)}.vp-dream{filter:brightness(1.08) saturate(.9) blur(.5px)}.vp-vintage{filter:sepia(.32) contrast(1.08) saturate(.78)}.vp-neon{filter:saturate(1.8) contrast(1.15) hue-rotate(8deg) drop-shadow(0 0 8px rgba(56,189,248,.5))}.vp-grain{filter:contrast(1.1) saturate(.9)}.vp-chromatic{filter:saturate(1.5) contrast(1.12) hue-rotate(-8deg) drop-shadow(2px 0 rgba(255,0,100,.35)) drop-shadow(-2px 0 rgba(0,220,255,.3))}.vp-cinema{filter:contrast(1.22) saturate(.86) brightness(.96)}.vp-bloom{filter:brightness(1.12) saturate(1.08) drop-shadow(0 0 10px rgba(255,255,255,.22))}.vp-night{filter:brightness(.8) contrast(1.25) saturate(1.25) hue-rotate(55deg)}.vp-retro{filter:sepia(.22) saturate(.82) contrast(.96) brightness(1.04)}.vp-edge{filter:contrast(1.35) saturate(1.25) drop-shadow(0 0 2px rgba(255,255,255,.25))}`}</style>
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c0f18]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3"><a href="/" className="rounded-lg p-2 hover:bg-white/10" title="Back to VibePulse"><ArrowLeft size={18}/></a><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500"><Clapperboard size={20}/></span><div><div className="font-black tracking-tight">VibePulse <span className="text-violet-300">{templateMode ? (location.state?.templateTitle || "Template") : "Studio"}</span></div><div className="text-[11px] text-slate-500">{templateMode ? "Template ready · 9:16 vertical video" : "Professional video workspace"}</div></div></div>
      <div className="flex flex-wrap items-center gap-2">{button('Undo',<Undo2 size={15}/>,undo)}{button('Redo',<Redo2 size={15}/>,redoEdit)}<select value={aspect} onChange={e=>setAspect(e.target.value)} className="rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"><option>16:9</option><option>9:16</option><option>1:1</option></select><button onClick={exportVideo} disabled={exporting} className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-50"><Download size={16}/>{exporting?'Exporting…':'Export video'}</button></div>
    </header>
    <div className={"grid min-h-[calc(100vh-65px)] grid-cols-1 " + (templateMode ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[230px_minmax(0,1fr)_270px]")}>
      {!templateMode && <aside className="border-b border-white/10 bg-[#0d1019] p-3 lg:border-b-0 lg:border-r">
        <div className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-slate-500">Editor tools</div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">{button('Media',<Film size={17}/>,()=>setPanel('media'),panel==='media')}{button('Audio',<Music2 size={17}/>,()=>setPanel('audio'),panel==='audio')}{button('Text',<Type size={17}/>,()=>setPanel('text'),panel==='text')}{button('Effects',<Sparkles size={17}/>,()=>setPanel('effects'),panel==='effects')}{button('Transitions',<WandSparkles size={17}/>,()=>setPanel('transitions'),panel==='transitions')}</div>
        <div className="mt-5 rounded-xl border border-dashed border-white/15 p-4">
          {panel==='media'&&<><ImagePlus className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Import media</div><p className="my-2 text-xs leading-5 text-slate-500">Add videos and images to your project timeline.</p><button onClick={()=>mediaRef.current?.click()} className="w-full rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold">Import files</button><input ref={mediaRef} type="file" accept="video/*,image/*" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value='';}}/></>}
          {panel==='audio'&&<><AudioLines className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Audio library</div><p className="my-2 text-xs text-slate-500">Add music or narration.</p><button onClick={()=>audioRef.current?.click()} className="w-full rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold">Import audio</button><input ref={audioRef} type="file" accept="audio/*" hidden onChange={e=>setAudioFile(e.target.files?.[0])}/>{audio&&<><div className="mt-3 break-words text-xs text-emerald-300">{audio.name}</div><button onClick={syncPhotosToBeat} className="mt-3 w-full rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 text-sm font-bold text-fuchsia-200 hover:bg-fuchsia-500/20">♫ Beat Sync Photos</button><label className="mt-3 block text-xs text-slate-400">Music volume: {audioVolume}%</label><input type="range" min="0" max="100" value={audioVolume} onChange={e=>setAudioVolume(Number(e.target.value))} className="mt-2 w-full"/><label className="mt-3 block text-xs text-slate-400">Fade in: {audioFadeIn}s</label><input type="range" min="0" max="5" step=".1" value={audioFadeIn} onChange={e=>setAudioFadeIn(Number(e.target.value))} className="mt-2 w-full"/><label className="mt-3 block text-xs text-slate-400">Fade out: {audioFadeOut}s</label><input type="range" min="0" max="5" step=".1" value={audioFadeOut} onChange={e=>setAudioFadeOut(Number(e.target.value))} className="mt-2 w-full"/></>}</>}
          {panel==='text'&&<><Type className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Title overlay</div><textarea value={title} onChange={e=>setTitle(e.target.value)} placeholder="Persistent title / watermark…" className="mt-3 min-h-20 w-full rounded-lg border border-white/10 bg-[#171b28] p-2 text-sm outline-none focus:border-violet-400"/><div className="mt-5 border-t border-white/10 pt-4"><div className="text-sm font-semibold">Timed captions / subtitles</div><p className="mt-1 text-xs leading-5 text-slate-500">Add captions at the current playhead. This is manual captioning, not speech-to-text.</p><textarea value={captionDraft} onChange={e=>setCaptionDraft(e.target.value)} placeholder="Type subtitle text…" className="mt-3 min-h-16 w-full rounded-lg border border-white/10 bg-[#171b28] p-2 text-sm outline-none focus:border-violet-400"/><button onClick={addCaption} className="mt-2 w-full rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold">+ Add caption at playhead</button><div className="mt-3 space-y-3">{captions.map(c=><div key={c.id} className="rounded-lg border border-white/10 p-2"><div className="mb-2 flex items-start justify-between gap-2"><div className="text-xs font-semibold text-slate-300">{c.text}</div><button onClick={()=>setCaptions(old=>old.filter(x=>x.id!==c.id))} className="text-xs text-red-300">Delete</button></div><div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-slate-500">Start (sec)<input type="number" min="0" step=".1" value={c.start} onChange={e=>setCaptions(old=>old.map(x=>x.id===c.id?{...x,start:Math.max(0,Number(e.target.value)||0)}:x))} className="mt-1 w-full rounded bg-[#171b28] p-2 text-xs text-white"/></label><label className="text-[11px] text-slate-500">Duration (sec)<input type="number" min=".2" step=".1" value={c.duration} onChange={e=>setCaptions(old=>old.map(x=>x.id===c.id?{...x,duration:Math.max(.2,Number(e.target.value)||.2)}:x))} className="mt-1 w-full rounded bg-[#171b28] p-2 text-xs text-white"/></label></div></div>)}</div></div><label className="mt-3 block text-xs text-slate-400">Text size: {Math.round(textSize*100)}%</label><input type="range" min=".5" max="2" step=".1" value={textSize} onChange={e=>setTextSize(Number(e.target.value))} className="mt-2 w-full"/><label className="mt-3 block text-xs text-slate-400">Vertical position: {textY}% from bottom</label><input type="range" min="2" max="45" step="1" value={textY} onChange={e=>setTextY(Number(e.target.value))} className="mt-2 w-full"/><p className="mt-2 text-xs text-slate-500">Text size and position are saved with your project.</p></>}
          {panel==='effects'&&<><Sparkles className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">AI-style Auto Edit</div><p className="my-2 text-xs leading-5 text-slate-500">One click applies stronger cinematic motion to every photo. No transitions between photos.</p><button onClick={applyAuto} className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 px-3 py-2 text-sm font-bold">✨ AI Auto Edit</button><button onClick={applyProAnimationPack} className="mt-2 w-full rounded-lg border border-violet-400/40 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/10">Apply Pro Motion Pack</button></>}
          {panel==='transitions'&&<><WandSparkles className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Transitions</div><p className="my-2 text-xs text-slate-500">Transitions are disabled for the documentary look; photos cut directly to the next image.</p>{active&&<select value={active.transition||'Cut'} onChange={e=>changeClip({transition:e.target.value})} className="w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm">{transitions.map(t=><option key={t}>{t}</option>)}</select>}<p className="mt-2 text-xs leading-5 text-slate-500">Transition choice is saved per clip.</p></>}
        </div>
        <div className="mt-5 text-xs text-slate-500">{clips.length} clips · {fmt(duration)} total</div>
      </aside>}
      <main className="min-w-0 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between"><div><div className="text-xs uppercase tracking-widest text-slate-500">Preview monitor</div><div className="text-sm text-slate-300">{activeAtTime?.name||'Import media to begin'}</div></div><div className="flex items-center gap-2 text-xs text-slate-500"><span className="rounded bg-white/5 px-2 py-1">{aspect}</span><span>{fmt(playhead)} / {fmt(duration)}</span></div></div>
        <div onDragOver={e=>e.preventDefault()} onDrop={handleMediaDrop} className="relative mx-auto flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl" style={{aspectRatio:aspect.replace(':',' / '),maxHeight:'56vh',width:'100%'}}>
          {activeAtTime?.type==='video'?<div key={activeAtTime.id} className="absolute inset-0 overflow-hidden bg-black"><video src={activeAtTime.url} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" aria-hidden="true"/><div className="absolute inset-0" style={{animation:previewTransitionAnimation}}><div onPointerDown={e=>{if(!activeAtTime)return;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging='true';e.currentTarget.dataset.x=String(activeAtTime.positionX||0);e.currentTarget.dataset.y=String(activeAtTime.positionY||0);e.currentTarget.dataset.px=String(e.clientX);e.currentTarget.dataset.py=String(e.clientY);}} onPointerMove={e=>{if(e.currentTarget.dataset.dragging!=='true'||!(e.buttons&1)||!activeAtTime)return;const r=e.currentTarget.getBoundingClientRect();const dx=(e.clientX-Number(e.currentTarget.dataset.px))/r.width*100;const dy=(e.clientY-Number(e.currentTarget.dataset.py))/r.height*100;const baseX=Number(e.currentTarget.dataset.x),baseY=Number(e.currentTarget.dataset.y),clipId=activeAtTime.id;setClips(old=>old.map(c=>c.id===clipId?{...c,positionX:Math.max(-40,Math.min(40,baseX+dx)),positionY:Math.max(-40,Math.min(40,baseY+dy))}:c));}} onPointerUp={e=>{e.currentTarget.dataset.dragging='false';}} onPointerCancel={e=>{e.currentTarget.dataset.dragging='false';}} className={`${effectClass} absolute inset-0 flex cursor-move touch-none items-center justify-center overflow-hidden`} style={{animation:previewAnimation}}><video ref={videoRef} style={{filter:activeAtTime.filter||'none',transform:'translate('+((activeAtTime.positionX||0))+'%, '+((activeAtTime.positionY||0))+'%) scale('+((activeAtTime.scale)||1)+')',objectFit:'contain'}} className="block h-full w-full object-contain" controls={false} playsInline onTimeUpdate={e=>{const c=activeAtTime;const before=clips.slice(0,clips.findIndex(x=>x.id===c.id)).reduce((s,x)=>s+x.duration,0);setPlayhead(before+Math.max(0,e.currentTarget.currentTime-(c.trimStart||0)));}}/></div></div></div>:
            activeAtTime?<div key={activeAtTime.id} className="absolute inset-0 overflow-hidden bg-black"><img src={activeAtTime.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" style={{animation:backgroundMotion}}/><div className="absolute inset-0" style={{animation:previewTransitionAnimation}}><div className={`${effectClass} absolute inset-0 flex items-center justify-center overflow-hidden`} style={{animation:previewAnimation}}><img ref={imageRef} src={activeAtTime.url} alt={activeAtTime.name} className="block h-full w-full object-contain" style={{filter:activeAtTime.filter||'none',transform:'translate('+((activeAtTime.positionX||0))+'%, '+((activeAtTime.positionY||0))+'%) scale('+((activeAtTime.scale)||1)+')',objectFit:'contain'}}/></div></div></div>:
            <div className="p-8 text-center"><Clapperboard size={48} className="mx-auto mb-4 text-slate-700"/><div className="text-lg font-semibold text-slate-400">Your video preview</div><p className="mt-2 text-sm text-slate-600">Import video or image files to start editing.</p><button onClick={()=>mediaRef.current?.click()} className="mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold">Import media</button></div>}
          {captions.find(c=>playhead>=c.start&&playhead<c.start+c.duration)?.text&&<div className="pointer-events-none absolute bottom-[12%] left-[6%] right-[6%] rounded-lg bg-black/55 px-3 py-2 text-center text-sm font-black text-white shadow-lg sm:text-lg">{captions.find(c=>playhead>=c.start&&playhead<c.start+c.duration)?.text}</div>}
          {title&&<div onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging='true';}} onPointerMove={e=>{if(e.currentTarget.dataset.dragging!=='true'||!(e.buttons&1))return;const r=e.currentTarget.parentElement.getBoundingClientRect();setTextY(Math.max(2,Math.min(45,Math.round((r.bottom-e.clientY)/r.height*100))));}} onPointerUp={e=>{e.currentTarget.dataset.dragging='false';}} onPointerCancel={e=>{e.currentTarget.dataset.dragging='false';}} className="absolute inset-x-5 cursor-move touch-none select-none text-center font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)]" style={{bottom:textY+'%',fontSize:'clamp(1rem, '+(1.5*textSize)+'vw, '+(2.25*textSize)+'rem)'}} title="Drag to reposition title">{title}</div>}
        </div>
        <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center justify-center gap-3">{button(playing?'Pause':'Play',playing?<Pause size={17}/>:<Play size={17}/>,()=>setPlaying(p=>!p))}<button onClick={()=>{setPlayhead(0);setPlaying(false);}} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10">Reset</button><button onClick={undo} disabled={!history.length} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-30"><Undo2 size={15} className="mr-1 inline"/> Undo</button><button onClick={redoEdit} disabled={!redo.length} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-30"><Redo2 size={15} className="mr-1 inline"/> Redo</button><span className="text-xs text-slate-500">Space: Play/Pause · C: Split · Delete: Remove · Ctrl+Z: Undo</span></div>
        {!templateMode && <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1019] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="font-bold">Timeline</div><div className="text-xs text-slate-500">Select · drag purple edges to trim · split · reorder · zoom · edit clip properties</div></div><div className="flex flex-wrap items-center gap-2"><button onClick={splitAtPlayhead} className="flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/20"><Scissors size={14}/> Split at playhead</button><button onClick={()=>setTimelineZoom(z=>Math.max(.5,z/1.25))} className="rounded-lg border border-white/10 px-2 py-2 text-xs hover:bg-white/5" title="Zoom out">−</button><span className="min-w-10 text-center text-xs text-slate-400">{Math.round(timelineZoom*100)}%</span><button onClick={()=>setTimelineZoom(z=>Math.min(4,z*1.25))} className="rounded-lg border border-white/10 px-2 py-2 text-xs hover:bg-white/5" title="Zoom in">+</button><button onClick={()=>mediaRef.current?.click()} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"><Plus size={14}/> Add media</button></div></div>
          <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500"><span>00:00</span><span>{fmt(duration)}</span></div>
          <div ref={timelineRef} onClick={seekTimeline} className="relative mb-3 h-4 cursor-crosshair rounded bg-[#202638]"><div className="absolute inset-y-0 left-0 rounded bg-violet-500/30" style={{width:`${playhead/duration*100}%`}}/><div className="absolute -top-1 bottom-[-5px] z-10 w-[2px] bg-pink-300" style={{left:`${playhead/duration*100}%`}}/></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] font-bold uppercase text-slate-500">Video</span><div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">{clips.map((c,i)=><button key={c.id} onClick={()=>{setSelected(c.id);setPlayhead(clips.slice(0,i).reduce((s,x)=>s+x.duration,0));}} className={`relative h-[72px] min-w-[105px] flex-1 overflow-hidden rounded-lg border text-left ${selected===c.id?'border-violet-400 ring-1 ring-violet-400':'border-white/10'}`} style={{flexGrow:c.duration,flexBasis:`${Math.max(90,c.duration*25*timelineZoom)}px`}}>{c.type==='image'?<img src={c.url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{filter:c.filter}}/>:<video src={c.url} muted className="absolute inset-0 h-full w-full object-cover" preload="metadata"/>}<span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-[10px]">{c.name}</span><span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px]">{fmt(c.duration)}</span><span role="button" tabIndex={0} aria-label="Trim clip start" onPointerDown={e=>beginTrim(e,c,'left')} onClick={e=>e.stopPropagation()} className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize bg-violet-300/70 hover:bg-violet-200" title="Drag to trim start"/><span role="button" tabIndex={0} aria-label="Trim clip end" onPointerDown={e=>beginTrim(e,c,'right')} onClick={e=>e.stopPropagation()} className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize bg-violet-300/70 hover:bg-violet-200" title="Drag to trim end"/></button>)}</div></div>
            <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] font-bold uppercase text-slate-500">Audio</span><div className="flex h-10 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs text-emerald-200"><AudioLines size={15}/><span className="truncate">{audio?.name||'Import audio to add a music track'}</span></div></div>
            <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] font-bold uppercase text-slate-500">Text</span><div className="flex h-8 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border border-pink-500/25 bg-pink-500/10 px-3 text-xs text-pink-200"><Type size={13}/><span className="truncate">{title||'No title overlay'}</span></div></div>
          </div>
          {clips.length>0&&<div className="mt-3 flex flex-wrap gap-2">{clips.map((c,i)=><div key={c.id} className="flex items-center gap-1 rounded-lg bg-white/5 p-1"><button onClick={()=>moveClip(i,-1)} disabled={!i} className="rounded px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-20">←</button><button onClick={()=>moveClip(i,1)} disabled={i===clips.length-1} className="rounded px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-20">→</button><button onClick={()=>removeClip(c.id)} className="rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/20" title="Remove clip"><Trash2 size={13}/></button></div>)}</div>}
        </section>}
        {templateMode && <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-center gap-3"><button onClick={()=>mediaRef.current?.click()} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Add more photos/videos</button><button onClick={()=>audioRef.current?.click()} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Add music</button><input ref={mediaRef} type="file" accept="video/*,image/*" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value="";}}/><input ref={audioRef} type="file" accept="audio/*" hidden onChange={e=>setAudioFile(e.target.files?.[0])}/><button onClick={()=>{setTemplateMode(false);setNotice("Full Studio controls are now available.")}} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Advanced editing</button></div>}
        {notice&&<div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/10 p-3 text-sm text-violet-100">{notice}</div>}
        {exportUrl&&<a href={exportUrl} download="vibepulse-studio.mp4" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black"><Download size={16}/> Download MP4 video</a>}
      </main>
      {!templateMode && <aside className="border-t border-white/10 bg-[#0d1019] p-4 lg:border-l lg:border-t-0">
        <div className="mb-4 flex items-center gap-2"><Settings2 size={17} className="text-violet-300"/><div className="font-bold">Inspector</div></div>
        {active?<><div className="mb-4 break-words text-sm font-semibold">{active.name}</div><div className="mb-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/5 p-2"><div className="text-slate-500">Media type</div><div className="mt-1 font-semibold">{active.type==='video'?'Video clip':'Image clip'}</div></div><div className="rounded-lg bg-white/5 p-2"><div className="text-slate-500">Clip length</div><div className="mt-1 font-semibold">{fmt(active.duration)}</div></div></div>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Timeline duration (seconds)</label><input type="number" min=".5" max="120" step=".5" value={active.duration} onChange={e=>changeClip({duration:Math.max(.5,Math.min(120,Number(e.target.value)||.5))})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"/>
          {active.type==='video'&&<><label className="mb-2 block text-xs font-semibold text-slate-400">Source trim start (seconds)</label><input type="number" min="0" step=".1" value={active.trimStart} onChange={e=>changeClip({trimStart:Math.max(0,Number(e.target.value)||0)})} className="mb-3 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"/><label className="mb-2 block text-xs font-semibold text-slate-400">Playback speed</label><select value={active.speed} onChange={e=>changeClip({speed:Number(e.target.value)})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"><option value="0.5">0.5× slow</option><option value="1">1× normal</option><option value="1.5">1.5×</option><option value="2">2×</option></select></>}
          {active.type==='video'&&<><label className="mb-2 block text-xs font-semibold text-slate-400">Source trim end (seconds)</label><input type="number" min={active.trimStart+.1} step=".1" value={active.trimEnd??active.duration} onChange={e=>changeClip({trimEnd:Math.max(active.trimStart+.1,Number(e.target.value)||active.trimStart+.1),duration:Math.max(.5,(Number(e.target.value)||active.trimStart+.1)-active.trimStart)})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"/></>}
          <label className="mb-2 block text-xs font-semibold text-slate-400">Scale: {Math.round((active.scale||1)*100)}%</label><input type="range" min=".5" max="2.5" step=".05" value={active.scale||1} onChange={e=>changeClip({scale:Number(e.target.value)})} className="mb-3 w-full"/><label className="mb-2 block text-xs font-semibold text-slate-400">Position X: {active.positionX||0}%</label><input type="range" min="-40" max="40" step="1" value={active.positionX||0} onChange={e=>changeClip({positionX:Number(e.target.value)})} className="mb-3 w-full"/><label className="mb-2 block text-xs font-semibold text-slate-400">Position Y: {active.positionY||0}%</label><input type="range" min="-40" max="40" step="1" value={active.positionY||0} onChange={e=>changeClip({positionY:Number(e.target.value)})} className="mb-4 w-full"/><label className="mb-2 block text-xs font-semibold text-slate-400">Animation start scale: {Math.round((active.startScale||1)*100)}%</label><input type="range" min="1" max="2.5" step=".01" value={active.startScale||1.02} onChange={e=>changeClip({startScale:Number(e.target.value)})} className="mb-3 w-full"/><label className="mb-2 block text-xs font-semibold text-slate-400">Animation end scale: {Math.round((active.endScale||1)*100)}%</label><input type="range" min="1" max="2.5" step=".01" value={active.endScale||1.08} onChange={e=>changeClip({endScale:Number(e.target.value)})} className="mb-4 w-full"/><label className="mb-2 block text-xs font-semibold text-slate-400">Color / filter</label><div className="mb-4 grid grid-cols-2 gap-2">{filters.map(([name,value])=><button key={name} onClick={()=>changeClip({filter:value})} className={`rounded-lg border px-2 py-2 text-xs ${active.filter===value?'border-violet-400 bg-violet-500/15':'border-white/10 hover:bg-white/5'}`}>{name}</button>)}</div>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Motion animation</label><select value={active.animation||'none'} onChange={e=>changeClip({animation:e.target.value})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm">{animations.map(([name,value])=><option key={value} value={value}>{name}</option>)}</select>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Visual effects</label><div className="mb-4 grid grid-cols-2 gap-2">{visualEffects.map(([name,value])=><button key={value} onClick={()=>changeClip({effect:value})} className={`rounded-lg border px-2 py-2 text-xs ${(active.effect||'none')===value?'border-violet-400 bg-violet-500/15':'border-white/10 hover:bg-white/5'}`}>{name}</button>)}</div>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Transition into clip</label><select value={active.transition||'Cut'} onChange={e=>changeClip({transition:e.target.value})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm">{transitions.map(t=><option key={t}>{t}</option>)}</select>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Clip volume</label><div className="mb-4 flex items-center gap-2"><Volume2 size={15}/><input type="range" min="0" max="100" value={active.volume} onChange={e=>changeClip({volume:Number(e.target.value)})} className="w-full"/><span className="text-xs">{active.volume}%</span></div>
          <button onClick={()=>removeClip(active.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 size={15}/> Delete selected clip</button>
        </>:<div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Select a timeline clip to edit its properties.</div>}
        <div className="mt-6 rounded-xl bg-white/[.03] p-3 text-xs leading-5 text-slate-500"><Scissors size={16} className="mb-2 text-violet-300"/><div className="font-semibold text-slate-300">Editing controls</div>Timeline duration, source trim, playback speed, filters, motion animations, visual effects, transitions, clip volume, clip ordering and deletion are available here. Video exports that require encoding original video clips need a dedicated render backend.</div>
      </aside>}
    </div>
  </div>;
}
