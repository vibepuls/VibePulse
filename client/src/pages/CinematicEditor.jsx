import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowDown, ArrowUp, AudioLines, Clapperboard, Download, Film, ImagePlus, LoaderCircle, Music2, Play, Sparkles, Trash2, WandSparkles } from 'lucide-react';

const MOTIONS = [
  { value: 'zoom-in', label: 'Slow zoom in' },
  { value: 'zoom-out', label: 'Slow zoom out' },
  { value: 'pan-left', label: 'Pan left' },
  { value: 'pan-right', label: 'Pan right' },
  { value: 'pan-up', label: 'Pan up' },
  { value: 'pan-down', label: 'Pan down' },
  { value: 'ken-burns', label: 'Ken Burns' },
  { value: 'still', label: 'Still frame' },
];
const FILTERS = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
  { value: 'mono', label: 'Black & white' },
  { value: 'vivid', label: 'Vivid' },
  { value: 'dreamy', label: 'Dreamy' },
  { value: 'none', label: 'Original' },
];
const TRANSITIONS = ['Crossfade', 'Flash', 'Soft blur', 'Cut'];
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const filterCss = (filter) => ({
  cinematic: 'contrast(1.12) saturate(.88) sepia(.12)',
  warm: 'saturate(1.12) sepia(.18)',
  cool: 'saturate(.92) hue-rotate(12deg)',
  mono: 'grayscale(1) contrast(1.12)',
  vivid: 'saturate(1.45) contrast(1.08)',
  dreamy: 'brightness(1.08) saturate(.9)',
  none: 'none',
}[filter] || 'none');

function drawCover(ctx, image, width, height, progress, motion, filter, overlayText) {
  const scaleBase = Math.max(width / image.width, height / image.height);
  let zoom = 1;
  let dx = 0;
  let dy = 0;
  if (motion === 'zoom-in' || motion === 'ken-burns') zoom = 1 + progress * .16;
  if (motion === 'zoom-out') zoom = 1.16 - progress * .16;
  if (motion === 'pan-left') { zoom = 1.16; dx = (progress - .5) * width * -.12; }
  if (motion === 'pan-right') { zoom = 1.16; dx = (progress - .5) * width * .12; }
  if (motion === 'pan-up') { zoom = 1.16; dy = (progress - .5) * height * -.12; }
  if (motion === 'pan-down') { zoom = 1.16; dy = (progress - .5) * height * .12; }
  if (motion === 'ken-burns') { dx = (progress - .5) * width * .06; dy = (progress - .5) * height * -.04; }
  const scale = scaleBase * zoom;
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.save();
  ctx.filter = filter === 'cinematic' ? 'contrast(1.12) saturate(.88) sepia(.12)' :
    filter === 'warm' ? 'saturate(1.12) sepia(.18)' :
    filter === 'cool' ? 'saturate(.92) hue-rotate(12deg)' :
    filter === 'mono' ? 'grayscale(1) contrast(1.12)' :
    filter === 'vivid' ? 'saturate(1.45) contrast(1.08)' :
    filter === 'dreamy' ? 'brightness(1.08) saturate(.9)' : 'none';
  ctx.fillStyle = '#050711';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, (width - dw) / 2 + dx, (height - dh) / 2 + dy, dw, dh);
  ctx.filter = 'none';
  const shade = ctx.createLinearGradient(0, height * .45, 0, height);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.66)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  if (overlayText) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.75)';
    ctx.shadowBlur = 12;
    const fontSize = Math.round(width * .045);
    ctx.font = '700 ' + fontSize + 'px Arial, sans-serif';
    const maxWidth = width * .84;
    const words = overlayText.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(-3).forEach((text, i, all) => ctx.fillText(text, width / 2, height - height * .08 - (all.length - 1 - i) * fontSize * 1.2, maxWidth));
  }
  ctx.restore();
}

export default function CinematicEditor() {
  const [slides, setSlides] = useState([]);
  const [mode, setMode] = useState('auto');
  const [transition, setTransition] = useState('Crossfade');
  const [aspect, setAspect] = useState('portrait');
  const [title, setTitle] = useState('');
  const [music, setMusic] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicVolume, setMusicVolume] = useState(65);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [exportUrl, setExportUrl] = useState('');
  const fileInput = useRef(null);
  const audioInput = useRef(null);
  const canvasRef = useRef(null);
  const previewAudioRef = useRef(null);
  const urls = useMemo(() => slides.map(s => s.url), [slides]);

  useEffect(() => () => {
    slides.forEach(s => URL.revokeObjectURL(s.url));
    if (music?.url) URL.revokeObjectURL(music.url);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
  // object URLs are deliberately cleaned when the editor unmounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (list) => {
    const files = Array.from(list || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return setError('Choose one or more image files.');
    if (slides.length + files.length > 20) return setError('You can use up to 20 photos per video.');
    setError('');
    const next = files.map((file, index) => ({
      id: uid(), file, url: URL.createObjectURL(file), name: file.name,
      duration: 3, motion: MOTIONS[(slides.length + index) % MOTIONS.length].value,
      filter: 'cinematic',
    }));
    setSlides(old => [...old, ...next]);
    setExportUrl('');
  };

  const updateSlide = (id, patch) => {
    setSlides(old => old.map(slide => slide.id === id ? { ...slide, ...patch } : slide));
    setExportUrl('');
  };
  const removeSlide = (id) => {
    setSlides(old => {
      const target = old.find(s => s.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return old.filter(s => s.id !== id);
    });
    setExportUrl('');
  };
  const moveSlide = (index, delta) => {
    setSlides(old => {
      const target = index + delta;
      if (target < 0 || target >= old.length) return old;
      const next = [...old];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const autoCinematic = () => {
    const motions = ['ken-burns', 'pan-left', 'zoom-in', 'pan-right', 'zoom-out', 'pan-up', 'pan-down'];
    const filters = ['cinematic', 'warm', 'cool', 'dreamy', 'vivid'];
    setSlides(old => old.map((slide, i) => ({
      ...slide, duration: 3.5, motion: motions[i % motions.length], filter: filters[i % filters.length],
    })));
    setTransition('Crossfade');
    setMode('auto');
    setError('');
    setExportUrl('');
  };

  const playPreview = async () => {
    if (!slides.length) return setError('Add photos before previewing your video.');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = aspect === 'landscape' ? 1280 : aspect === 'square' ? 1080 : 720;
    const height = aspect === 'landscape' ? 720 : aspect === 'square' ? 1080 : 1280;
    canvas.width = width; canvas.height = height;
    const loaded = await Promise.all(slides.map(s => new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve({ ...s, image: img }); img.onerror = reject; img.src = s.url;
    })));
    let start = performance.now();
    const total = loaded.reduce((sum, s) => sum + Number(s.duration), 0) * 1000;
    const frame = (now) => {
      const elapsed = (now - start) % total;
      let offset = 0;
      let current = 0;
      for (let i = 0; i < loaded.length; i++) {
        if (elapsed < offset + loaded[i].duration * 1000) { current = i; break; }
        offset += loaded[i].duration * 1000;
      }
      const item = loaded[current];
      const p = Math.min(1, Math.max(0, (elapsed - offset) / (item.duration * 1000)));
      drawCover(ctx, item.image, width, height, p, item.motion, item.filter, title);
      if (transition === 'Crossfade' && p > .82 && loaded.length > 1) {
        const next = loaded[(current + 1) % loaded.length];
        ctx.globalAlpha = (p - .82) / .18;
        drawCover(ctx, next.image, width, height, 0, next.motion, next.filter, title);
        ctx.globalAlpha = 1;
      } else if (transition === 'Flash' && p > .92) {
        ctx.fillStyle = 'rgba(255,255,255,' + ((p - .92) / .08) + ')'; ctx.fillRect(0, 0, width, height);
      } else if (transition === 'Soft blur' && p > .82) {
        ctx.fillStyle = 'rgba(255,255,255,' + (((p - .82) / .18) * .08) + ')'; ctx.fillRect(0, 0, width, height);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const exportVideo = async () => {
    setError('');
    if (!slides.length) return setError('Add at least one photo first.');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return setError('Video export is not supported by this browser. Try the latest Chrome or Edge.');
    setExporting(true); setProgress(0);
    try {
      const width = aspect === 'landscape' ? 1280 : aspect === 'square' ? 1080 : 720;
      const height = aspect === 'landscape' ? 720 : aspect === 'square' ? 1080 : 1280;
      const canvas = canvasRef.current;
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      const loaded = await Promise.all(slides.map(s => new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve({ ...s, image: img }); img.onerror = () => reject(new Error('Could not read ' + s.name)); img.src = s.url;
      })));
      const totalMs = loaded.reduce((sum, s) => sum + Number(s.duration) * 1000, 0);
      const stream = canvas.captureStream(30);
      let audioContext;
      let audioElement;
      let audioSource;
      let audioDestination;
      let objectMusicUrl;
      const musicSource = music?.file ? URL.createObjectURL(music.file) : musicUrl.trim();
      if (musicSource) {
        audioContext = new AudioContext();
        audioElement = new Audio(musicSource);
        audioElement.loop = true;
        audioElement.volume = Math.max(0, Math.min(1, musicVolume / 100));
        audioSource = audioContext.createMediaElementSource(audioElement);
        audioDestination = audioContext.createMediaStreamDestination();
        const gain = audioContext.createGain(); gain.gain.value = musicVolume / 100;
        audioSource.connect(gain); gain.connect(audioDestination); gain.connect(audioContext.destination);
        audioDestination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        objectMusicUrl = musicSource.startsWith('blob:') ? musicSource : null;
      }
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6500000 } : undefined);
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error('The browser stopped recording unexpectedly.'));
      });
      if (audioContext) { await audioContext.resume(); await audioElement.play().catch(() => {}); }
      recorder.start(250);
      const start = performance.now();
      await new Promise(resolve => {
        const drawFrame = (now) => {
          const elapsed = Math.min(totalMs, now - start);
          let offset = 0;
          let current = loaded.length - 1;
          for (let i = 0; i < loaded.length; i++) {
            if (elapsed < offset + loaded[i].duration * 1000) { current = i; break; }
            offset += loaded[i].duration * 1000;
          }
          const item = loaded[current];
          const p = Math.min(1, Math.max(0, (elapsed - offset) / (item.duration * 1000)));
          drawCover(ctx, item.image, width, height, p, item.motion, item.filter, title);
          if (transition === 'Crossfade' && p > .82 && current < loaded.length - 1) {
            const next = loaded[current + 1];
            ctx.globalAlpha = (p - .82) / .18;
            drawCover(ctx, next.image, width, height, 0, next.motion, next.filter, title);
            ctx.globalAlpha = 1;
          } else if (transition === 'Flash' && p > .92) {
            ctx.fillStyle = 'rgba(255,255,255,' + ((p - .92) / .08) + ')'; ctx.fillRect(0, 0, width, height);
          } else if (transition === 'Soft blur' && p > .82) {
            ctx.fillStyle = 'rgba(255,255,255,' + (((p - .82) / .18) * .08) + ')'; ctx.fillRect(0, 0, width, height);
          }
          setProgress(Math.min(100, Math.round(elapsed / totalMs * 100)));
          if (elapsed >= totalMs) resolve();
          else requestAnimationFrame(drawFrame);
        };
        requestAnimationFrame(drawFrame);
      });
      recorder.stop();
      await stopped;
      stream.getTracks().forEach(track => track.stop());
      if (audioElement) { audioElement.pause(); audioElement.src = ''; }
      if (audioContext) await audioContext.close();
      if (objectMusicUrl) URL.revokeObjectURL(objectMusicUrl);
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (!blob.size) throw new Error('The exported video was empty. Please try again.');
      setExportUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (e) {
      setError(e?.message || 'Video export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return <div className="min-h-screen bg-[#070b17] text-slate-100">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070b17]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <a href="/" className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white"><ArrowLeft size={17}/> Back to VibePulse</a>
        <div className="flex items-center gap-2 font-black tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500"><Clapperboard size={19}/></span><span>Cinematic Studio</span></div>
        <span className="hidden text-xs text-slate-500 sm:block">Local photo editing · no uploads until you export</span>
      </div>
    </header>
    <main className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px]">
      <section className="space-y-5">
        <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-slate-900 to-pink-500/10 p-5 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-violet-300"><Sparkles size={15}/> VibePulse Creator</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Turn your photos into a cinematic story.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Add up to 20 photos, give each one its own movement and color grade, add music, then export a video file. Your original social feed stays untouched.</p>
          <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold text-white hover:bg-violet-400"><ImagePlus size={18}/> Add photos</button><button onClick={autoCinematic} disabled={!slides.length} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-40"><WandSparkles size={17}/> Auto Cinematic</button><button onClick={playPreview} disabled={!slides.length} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-40"><Play size={17}/> Preview motion</button></div>
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }}/>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Your photo sequence</h2><p className="mt-1 text-xs text-slate-400">{slides.length}/20 photos · drag-free reorder with arrows</p></div><div className="flex gap-1 rounded-xl bg-black/30 p-1"><button onClick={() => setMode('auto')} className={'rounded-lg px-3 py-2 text-xs font-bold '+(mode==='auto'?'bg-violet-500 text-white':'text-slate-400')}>Auto</button><button onClick={() => setMode('manual')} className={'rounded-lg px-3 py-2 text-xs font-bold '+(mode==='manual'?'bg-violet-500 text-white':'text-slate-400')}>Manual</button></div></div>
          {!slides.length && <button onClick={() => fileInput.current?.click()} className="mt-4 grid min-h-48 w-full place-items-center rounded-2xl border border-dashed border-white/20 bg-black/20 p-6 text-center text-slate-400 hover:border-violet-400/60"><span><ImagePlus size={34} className="mx-auto mb-3 text-violet-300"/><strong className="block text-white">Select multiple photos</strong><span className="mt-1 block text-sm">JPG, PNG, WEBP and other browser-readable image formats</span></span></button>}
          <div className="mt-4 space-y-3">{slides.map((slide, index) => <article key={slide.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[100px_minmax(0,1fr)]">
            <img src={slide.url} alt={slide.name} className="h-28 w-full rounded-xl object-cover sm:h-24"/>
            <div className="min-w-0">
              <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{index + 1}. {slide.name}</div><div className="mt-1 text-xs text-slate-500">Each photo keeps its own settings</div></div><div className="flex gap-1"><button title="Move up" aria-label="Move up" disabled={!index} onClick={() => moveSlide(index,-1)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={15}/></button><button title="Move down" aria-label="Move down" disabled={index===slides.length-1} onClick={() => moveSlide(index,1)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={15}/></button><button title="Remove photo" aria-label="Remove photo" onClick={() => removeSlide(slide.id)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-400/10"><Trash2 size={15}/></button></div></div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><label className="text-xs text-slate-400">Motion<select value={slide.motion} onChange={e => updateSlide(slide.id,{motion:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white">{MOTIONS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label className="text-xs text-slate-400">Color effect<select value={slide.filter} onChange={e => updateSlide(slide.id,{filter:e.target.value})} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white">{FILTERS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label className="text-xs text-slate-400">Duration: {slide.duration}s<input type="range" min="1" max="8" step=".5" value={slide.duration} onChange={e => updateSlide(slide.id,{duration:Number(e.target.value)})} className="mt-2 w-full accent-violet-400"/></label></div>
            </div>
          </article>)}</div>
        </div>
      </section>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-5"><h2 className="font-bold">Project settings</h2><div className="mt-4 space-y-4">
          <label className="block text-xs text-slate-400">Video shape<select value={aspect} onChange={e => setAspect(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white"><option value="portrait">Portrait · Shorts / Reels (9:16)</option><option value="square">Square · Feed (1:1)</option><option value="landscape">Landscape · YouTube (16:9)</option></select></label>
          <label className="block text-xs text-slate-400">Title / overlay text<input value={title} onChange={e => setTitle(e.target.value)} maxLength="100" placeholder="Your story title (optional)" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white placeholder:text-slate-500"/></label>
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300"><Music2 size={15}/> Background music</div><button onClick={() => audioInput.current?.click()} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm hover:bg-white/10"><AudioLines size={16} className="mr-2 inline text-violet-300"/>{music?.file?.name || 'Choose an audio file (MP3, WAV, OGG)'}</button><input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={e => {const file=e.target.files?.[0];if(file){if(music?.url)URL.revokeObjectURL(music.url);setMusic({file,url:URL.createObjectURL(file)});setMusicUrl('');}e.target.value='';}}/><label className="mt-3 block text-xs text-slate-400">Or music URL<input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="https://…/music.mp3" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white placeholder:text-slate-500"/></label>{music && <button onClick={() => {URL.revokeObjectURL(music.url);setMusic(null);}} className="mt-2 text-xs text-rose-300">Remove selected music</button>}<label className="mt-3 block text-xs text-slate-400">Music volume: {musicVolume}%<input type="range" min="0" max="100" value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))} className="mt-2 w-full accent-violet-400"/></label></div>
          <label className="block text-xs text-slate-400">Transition between photos<select value={transition} onChange={e => setTransition(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white">{TRANSITIONS.map(x => <option key={x}>{x}</option>)}</select></label>
        </div></section>
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-5"><h2 className="font-bold">Export video</h2><p className="mt-2 text-xs leading-5 text-slate-400">Exports WebM in your browser. Use Chrome or Edge for best compatibility. Video stays on your device; it is not automatically posted.</p>{exporting && <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-slate-400"><span>Rendering video…</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400 transition-all" style={{width:progress+'%'}}/></div></div>}<button onClick={exportVideo} disabled={exporting||!slides.length} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{exporting?<><LoaderCircle size={17} className="animate-spin"/> Rendering {progress}%</>:<><Film size={17}/> Create video</>}</button>{exportUrl && <a href={exportUrl} download="vibepulse-cinematic.webm" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200"><Download size={17}/> Download video</a>}{error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}<p className="mt-3 text-[11px] leading-5 text-slate-500">Tip: Auto Cinematic assigns different motions and looks to each photo. Manual mode lets you fine-tune every photo separately.</p></section>
      </aside>
      <canvas ref={canvasRef} className="fixed -left-[10000px] top-0 h-px w-px" aria-hidden="true"/>
    </main>
  </div>;
}
