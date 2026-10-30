import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Film, ImagePlus, Music2, Pause, Play, Plus, Scissors, Sparkles, Trash2, Volume2 } from 'lucide-react';

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

export default function TemplateVideoMaker() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const musicInputRef = useRef(null);
  const rafRef = useRef(0);
  const mediaRef = useRef([]);
  const [templateId, setTemplateId] = useState(location.state?.templateId || new URLSearchParams(location.search).get('template') || 'cinematic-gold');
  const preset = PRESETS[templateId] || DEFAULT_PRESET;
  const [clips, setClips] = useState([]);
  const [music, setMusic] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [title, setTitle] = useState('');
  const [clipDuration, setClipDuration] = useState(preset.duration);
  const [motion, setMotion] = useState(preset.motion);
  const [filter, setFilter] = useState(preset.filter);
  const [transition, setTransition] = useState(preset.transition);
  const [beatSync, setBeatSync] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('Choose photos or videos to start building your template video.');
  const [exportUrl, setExportUrl] = useState('');
  const [selected, setSelected] = useState('');
  const [aspect, setAspect] = useState('9:16');
  const totalDuration = Math.max(0.1, clips.reduce((n,c)=>n+c.duration,0));
  const selectedClip = clips.find(c=>c.id===selected) || clips[0];

  useEffect(() => {
    const incoming = location.state?.templateFiles;
    if (incoming?.length) addFiles(incoming, true);
    // Apply a preset only on initial route entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing || !clips.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const start = performance.now();
    const draw = (now) => {
      const elapsed = (now-start)/1000;
      const slot = beatSync ? Math.max(.45, clipDuration*.65) : Math.max(.5, clipDuration);
      const index = Math.min(clips.length-1, Math.floor(elapsed/slot));
      const clip = clips[index];
      const local = (elapsed % slot)/slot;
      canvas.width = aspect==='9:16' ? 540 : 960;
      canvas.height = aspect==='9:16' ? 960 : 540;
      drawClip(ctx, canvas, clip, local, motion, filter, transition, index);
      if (elapsed < totalDuration) rafRef.current=requestAnimationFrame(draw);
      else setPlaying(false);
    };
    rafRef.current=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, clips, clipDuration, motion, filter, transition, beatSync, aspect, totalDuration]);

  useEffect(() => () => {
    clips.forEach(c=>{ if(c.url) URL.revokeObjectURL(c.url); });
    if(musicUrl) URL.revokeObjectURL(musicUrl);
    if(exportUrl) URL.revokeObjectURL(exportUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(fileList, initial=false) {
    const files=Array.from(fileList||[]).filter(f=>f.type.startsWith('image/')||f.type.startsWith('video/'));
    if(!files.length) { if(!initial) setNotice('Please choose image or video files.'); return; }
    const added=files.map(file=>({id:makeId(),file,name:file.name,type:file.type.startsWith('video/')?'video':'image',url:URL.createObjectURL(file),duration:file.type.startsWith('video/')?Math.min(8,clipDuration*2):clipDuration}));
    setClips(old=>[...old,...added]);
    setSelected(old=>old||added[0].id);
    setNotice(`${added.length} media file(s) added. Reorder or remove clips, then preview and export.`);
    setExportUrl('');
  }
  function removeClip(id) {
    setClips(old=>{const target=old.find(c=>c.id===id);if(target?.url)URL.revokeObjectURL(target.url);return old.filter(c=>c.id!==id);});
    if(selected===id) setSelected(clips.find(c=>c.id!==id)?.id||'');
    setExportUrl('');
  }
  function moveClip(index,step) {
    const to=index+step;if(to<0||to>=clips.length)return;
    setClips(old=>{const next=[...old];[next[index],next[to]]=[next[to],next[index]];return next;});
    setExportUrl('');
  }
  function chooseMusic(file) {
    if(!file)return;
    if(musicUrl)URL.revokeObjectURL(musicUrl);
    setMusic(file);setMusicUrl(URL.createObjectURL(file));setNotice('Your music track is ready. Music is user-provided; no licensed TikTok music catalogue is included.');
    setExportUrl('');
  }
  function drawClip(ctx,canvas,clip,progress,motionName,filterValue,transitionName,index) {
    ctx.fillStyle='#090b14';ctx.fillRect(0,0,canvas.width,canvas.height);
    if(!clip){ctx.fillStyle='#fff';ctx.font='28px sans-serif';ctx.fillText('Add photos or videos',35,70);return;}
    let source=mediaRef.current.find(x=>x.id===clip.id);
    if(!source) {
      if(clip.type==='image') { const img=new Image();img.src=clip.url;source={id:clip.id,el:img};mediaRef.current.push(source); }
      else { const video=document.createElement('video');video.src=clip.url;video.muted=true;video.playsInline=true;video.loop=true;video.preload='auto';source={id:clip.id,el:video};mediaRef.current.push(source);video.play().catch(()=>{}); }
    }
    const el=source.el;
    if(el instanceof HTMLImageElement&&!el.complete){el.onload=()=>{};return;}
    if(el instanceof HTMLVideoElement&&el.readyState<2){el.play().catch(()=>{});return;}
    const w=el.videoWidth||el.naturalWidth||canvas.width,h=el.videoHeight||el.naturalHeight||canvas.height;
    if(!w||!h)return;
    let scale=Math.max(canvas.width/w,canvas.height/h);
    const pulse=motionName==='shake'?Math.sin(progress*38)*.025:0;
    if(motionName==='zoom')scale*=1+progress*.16+pulse;
    else if(motionName==='pan')scale*=1.12;
    const dw=w*scale,dh=h*scale;
    let dx=(canvas.width-dw)/2,dy=(canvas.height-dh)/2;
    if(motionName==='pan'){dx-=(dw-canvas.width)*progress*.35;dy-=(dh-canvas.height)*progress*.18;}
    if(motionName==='shake'){dx+=pulse*canvas.width;dy+=Math.cos(progress*31)*.01*canvas.height;}
    ctx.save();ctx.filter=filterValue||'none';
    try{ctx.drawImage(el,dx,dy,dw,dh);}catch{}
    ctx.restore();
    if(transitionName==='flash'&&progress<.12){ctx.fillStyle=`rgba(255,255,255,${(1-progress/.12)*.8})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(transitionName==='fade'&&progress<.12){ctx.fillStyle=`rgba(0,0,0,${1-progress/.12})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(title){ctx.fillStyle='rgba(0,0,0,.36)';ctx.fillRect(0,canvas.height*.78,canvas.width,canvas.height*.22);ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(canvas.width*.055)}px sans-serif`;ctx.textAlign='center';ctx.fillText(title.slice(0,80),canvas.width/2,canvas.height*.88,canvas.width*.86);ctx.textAlign='start';}
  }
  async function exportVideo() {
    if(!clips.length){setNotice('Add at least one photo or video before exporting.');return;}
    if(!canvasRef.current?.captureStream||!window.MediaRecorder){setNotice('Video export is not supported in this browser. Try the latest Chrome or Edge.');return;}
    setExporting(true);setNotice('Rendering your template video… keep this tab open until export finishes.');
    try {
      const canvas=canvasRef.current,ctx=canvas.getContext('2d');
      canvas.width=aspect==='9:16'?540:960;canvas.height=aspect==='9:16'?960:540;
      const stream=canvas.captureStream(30);
      let audioContext,sourceNode,mediaSource;
      if(musicUrl){
        const audioEl=new Audio(musicUrl);audioEl.loop=true;audioEl.volume=.9;await audioEl.play();
        audioContext=new AudioContext();mediaSource=audioContext.createMediaElementSource(audioEl);sourceNode=audioContext.createMediaStreamDestination();mediaSource.connect(sourceNode);mediaSource.connect(audioContext.destination);
        sourceNode.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      }
      const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
      const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000});
      const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('Recording failed'));});
      recorder.start(250);
      const slot=beatSync?Math.max(.45,clipDuration*.65):Math.max(.5,clipDuration);
      const start=performance.now();
      await new Promise(resolve=>{
        const frame=now=>{
          const elapsed=(now-start)/1000;const index=Math.min(clips.length-1,Math.floor(elapsed/slot));const progress=(elapsed%slot)/slot;
          drawClip(ctx,canvas,clips[index],progress,motion,filter,transition,index);
          if(elapsed<totalDuration)requestAnimationFrame(frame);else resolve();
        };requestAnimationFrame(frame);
      });
      recorder.stop();await done;
      const blob=new Blob(chunks,{type:'video/webm'});if(exportUrl)URL.revokeObjectURL(exportUrl);
      setExportUrl(URL.createObjectURL(blob));setNotice('Export finished. Download your WebM video below.');
      if(audioContext)await audioContext.close();
      stream.getTracks().forEach(t=>t.stop());
    } catch(e) { setNotice('Export failed: '+(e?.message||'Unknown browser error')); }
    finally {setExporting(false);}
  }

  const selectPreset = id => {setTemplateId(id);const p=PRESETS[id]||DEFAULT_PRESET;setFilter(p.filter);setMotion(p.motion);setClipDuration(p.duration);setTransition(p.transition);setNotice(p.label+' preset applied. Add media or continue editing.');setExportUrl('');};
  const templateOptions=Object.entries(PRESETS);
  return <main className="min-h-screen bg-[#080b14] text-white">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#080b14]/95 px-4 py-3 backdrop-blur"><button onClick={()=>navigate('/templates')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10"><ArrowLeft size={17}/> Templates</button><div className="flex items-center gap-2 font-black"><Film size={20} className="text-violet-300"/> Template Video Maker</div><span className="text-xs text-slate-400">Separate from News Editor</span></header>
    <div className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">Create with Templates</h1><p className="mt-1 text-sm text-slate-400">Choose a style, add media, preview and export.</p></div><button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 font-bold hover:bg-violet-400"><ImagePlus size={17}/> Add photos/videos</button><input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={e=>{addFiles(e.target.files);e.target.value='';}}/></div>
        <div className="flex justify-center rounded-3xl border border-white/10 bg-black/40 p-4"><canvas ref={canvasRef} width={540} height={960} className="max-h-[68vh] w-auto max-w-full rounded-xl bg-slate-900" /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={()=>setPlaying(v=>!v)} disabled={!clips.length} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-black disabled:opacity-40">{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pause preview':'Preview video'}</button><button onClick={()=>musicInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 font-semibold hover:bg-white/5"><Music2 size={16}/> {music?'Change music':'Add music'}</button><input ref={musicInputRef} type="file" accept="audio/*" hidden onChange={e=>{chooseMusic(e.target.files?.[0]);e.target.value='';}}/><span className="flex items-center gap-1 text-xs text-slate-400"><Volume2 size={14}/>{music?music.name:'No music added'}</span></div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Your timeline <span className="text-xs font-normal text-slate-400">({clips.length} clips · {formatTime(totalDuration)})</span></h2><button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-1 text-sm text-violet-300"><Plus size={15}/> Add</button></div>{clips.length===0?<div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Choose photos or videos to build your template.</div>:<div className="flex gap-3 overflow-x-auto pb-2">{clips.map((c,i)=><div key={c.id} className={`w-32 shrink-0 rounded-xl border p-2 ${selectedClip?.id===c.id?'border-violet-400 bg-violet-400/10':'border-white/10 bg-black/20'}`}><button onClick={()=>setSelected(c.id)} className="w-full text-left"><div className="mb-2 aspect-[9/16] overflow-hidden rounded-lg bg-slate-800">{c.type==='image'?<img src={c.url} alt="" className="h-full w-full object-cover"/>:<video src={c.url} muted className="h-full w-full object-cover"/>}</div><div className="truncate text-xs font-semibold">{i+1}. {c.name}</div><div className="mt-1 text-[11px] text-slate-400">{c.type} · {c.duration.toFixed(1)}s</div></button><div className="mt-2 flex justify-between"><button onClick={()=>moveClip(i,-1)} disabled={!i} className="text-xs text-slate-300 disabled:opacity-30">←</button><button onClick={()=>moveClip(i,1)} disabled={i===clips.length-1} className="text-xs text-slate-300 disabled:opacity-30">→</button><button onClick={()=>removeClip(c.id)} className="text-rose-300"><Trash2 size={14}/></button></div></div>)}</div>}</div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="mb-3 flex items-center gap-2 font-black"><Sparkles size={17} className="text-violet-300"/> Template style</h2><label className="mb-3 block text-xs text-slate-400">Preset</label><select value={templateId} onChange={e=>selectPreset(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">{templateOptions.map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select><p className="mt-2 text-xs leading-5 text-slate-400">Every preset has its own starting look, motion, clip timing and transition.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="mb-4 font-black">Edit video</h2><label className="mb-2 block text-xs text-slate-400">Canvas ratio</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="9:16">9:16 TikTok / Reels / Shorts</option><option value="16:9">16:9 Landscape</option><option value="1:1">1:1 Square</option></select><label className="mb-2 block text-xs text-slate-400">Motion</label><select value={motion} onChange={e=>{setMotion(e.target.value);setExportUrl('');}} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="zoom">Slow zoom</option><option value="pan">Pan / parallax style</option><option value="shake">Shake / energetic</option><option value="none">None</option></select><label className="mb-2 block text-xs text-slate-400">Color filter</label><select value={filter} onChange={e=>{setFilter(e.target.value);setExportUrl('');}} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="none">Original</option><option value="contrast(1.12) saturate(.9)">Cinematic</option><option value="sepia(.2) saturate(1.1)">Warm vintage</option><option value="grayscale(1) contrast(1.1)">Black & white</option><option value="saturate(1.35) contrast(1.1)">Vivid</option><option value="brightness(1.08) saturate(.9)">Dreamy</option><option value="contrast(1.25) saturate(1.3)">Hype</option></select><label className="mb-2 block text-xs text-slate-400">Seconds per photo</label><input type="range" min=".5" max="5" step=".1" value={clipDuration} onChange={e=>{setClipDuration(Number(e.target.value));setClips(old=>old.map(c=>c.type==='image'?{...c,duration:Number(e.target.value)}:c));setExportUrl('');}} className="w-full"/><div className="mb-4 text-sm">{clipDuration.toFixed(1)} seconds</div><label className="mb-2 block text-xs text-slate-400">Transition</label><select value={transition} onChange={e=>{setTransition(e.target.value);setExportUrl('');}} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"><option value="cut">Cut</option><option value="fade">Fade</option><option value="flash">Flash</option><option value="slide">Slide (preview style)</option></select><label className="flex items-center gap-2 rounded-xl bg-black/20 p-3 text-sm"><input type="checkbox" checked={beatSync} onChange={e=>{setBeatSync(e.target.checked);setExportUrl('');}}/> Beat-paced cuts (faster template timing)</label><label className="mt-4 block text-xs text-slate-400">Video title (optional)</label><input value={title} onChange={e=>{setTitle(e.target.value);setExportUrl('');}} placeholder="Add a title..." className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"/></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="mb-2 font-black">Export</h2><p className="mb-3 text-xs leading-5 text-slate-400">Exports a WebM video in your browser. For best results use Chrome or Edge and keep this tab open while rendering.</p><button onClick={exportVideo} disabled={exporting||!clips.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 font-black disabled:opacity-50"><Download size={17}/>{exporting?'Rendering…':'Export video'}</button>{exportUrl&&<a href={exportUrl} download={(title||'vibepulse-template-video').replace(/[^a-z0-9-_]/gi,'-')+'.webm'} className="mt-3 block rounded-xl bg-emerald-500 px-4 py-3 text-center font-bold text-white">Download finished video</a>}</div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">{notice}</div>
      </aside>
    </div>
  </main>;
}
