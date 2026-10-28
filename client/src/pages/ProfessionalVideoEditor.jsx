import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, AudioLines, Clapperboard, Download, Film, ImagePlus, Music2, Pause, Play, Plus, Scissors, Settings2, Sparkles, Trash2, Type, Undo2, Redo2, Volume2, WandSparkles } from 'lucide-react';

const id = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
const fmt = (n) => { const v = Math.max(0, Number(n) || 0); return `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, '0')}`; };
const animations = [['None','none'],['Ken Burns — Zoom In','vp-ken-burns-in'],['Ken Burns — Zoom Out','vp-ken-burns-out'],['Ken Burns — Pan Left','vp-ken-burns-left'],['Ken Burns — Pan Right','vp-ken-burns-right'],['Ken Burns — Pan Up','vp-ken-burns-up'],['Ken Burns — Pan Down','vp-ken-burns-down'],['2.5D Parallax','vp-25d'],['Cinematic Push In','vp-push'],['Cinematic Pull Back','vp-zoom-out'],['Dynamic Drift','vp-drift-right'],['Soft Fade In','vp-fade']];
const visualEffects = [['None','none'],['Glow','vp-glow'],['VHS','vp-vhs'],['Dream Blur','vp-dream'],['Flash','vp-flash'],['Vintage','vp-vintage'],['Neon','vp-neon'],['Film Grain','vp-grain'],['Chromatic','vp-chromatic'],['Cinematic Contrast','vp-cinema'],['Soft Bloom','vp-bloom'],['Night Vision','vp-night'],['Retro Fade','vp-retro'],['Edge Pop','vp-edge']];
const transitions = ['Cut'];
const transitionAnimations = { Cut: 'none', Fade: 'vp-transition-fade', Dissolve: 'vp-transition-dissolve', Zoom: 'vp-transition-zoom', Slide: 'vp-transition-slide', Flash: 'vp-transition-flash' };
const filters = [
  ['Original','none'], ['Cinematic','contrast(1.12) saturate(.88) sepia(.12)'],
  ['Warm','saturate(1.12) sepia(.18)'], ['Cool','saturate(.92) hue-rotate(12deg)'],
  ['B&W','grayscale(1) contrast(1.12)'], ['Vivid','saturate(1.45) contrast(1.08)'], ['Dreamy','brightness(1.08) saturate(.9)']
];

export default function ProfessionalVideoEditor() {
  const [clips, setClips] = useState([]);
  const [audio, setAudio] = useState(null);
  const [selected, setSelected] = useState(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [aspect, setAspect] = useState('16:9');
  const [panel, setPanel] = useState('media');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
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
      return { id:id(), file, name:file.name, type, url:URL.createObjectURL(file), duration:type==='video'?10:8, trimStart:0, trimEnd:type==='video'?10:8, filter:'none', speed:1, volume:100, start:0 };
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
  const seekTimeline = (event) => {
    const rect=timelineRef.current?.getBoundingClientRect(); if(!rect) return;
    setPlayhead(Math.max(0,Math.min(duration,((event.clientX-rect.left)/rect.width)*duration)));
  };
  const motionDuration = activeAtTime ? Math.max(8, activeAtTime.duration || 8) : 8;
  const previewAnimation = activeAtTime?.animation && activeAtTime.animation !== 'none' ? `${activeAtTime.animation} ${motionDuration}s cubic-bezier(.12,.5,.4,.75) 1 both` : 'none';
  const backgroundMotion = activeAtTime?.animation === 'vp-25d' ? `vp-25d-background ${motionDuration}s cubic-bezier(.12,.5,.4,.75) 1 both` : activeAtTime?.animation?.startsWith('vp-ken-burns') ? `vp-ken-burns-background ${motionDuration}s cubic-bezier(.12,.5,.4,.75) 1 both` : 'none';
  const transitionName = 'Cut';
  const transitionDuration = transitionName === 'Cut' ? 0 : transitionName === 'Fade' ? 420 : transitionName === 'Dissolve' ? 620 : transitionName === 'Zoom' ? 560 : transitionName === 'Slide' ? 520 : 360;
  const previewTransitionAnimation = transitionName !== 'Cut' && transitionAnimations[transitionName] ? `${transitionAnimations[transitionName]} ${transitionDuration}ms cubic-bezier(.22,.61,.36,1) 1 both` : 'none';
  const effectClass = activeAtTime?.effect && activeAtTime.effect !== 'none' ? activeAtTime.effect : '';
  const setAudioFile = (file) => {
    if (!file) return;
    if (audio?.url) URL.revokeObjectURL(audio.url);
    setAudio({file,url:URL.createObjectURL(file),name:file.name});
    setNotice('Audio added. Use the audio track below to see it in your edit.');
  };
  const exportVideo = async () => {
    setNotice('');
    if (!clips.length) { setNotice('Import a video or image first.'); return; }
    const onlyImages = clips.every(c=>c.type==='image');
    if (!onlyImages) {
      setNotice('This browser-only exporter currently exports image-based edits. Video clip timeline editing and preview are available; native video export needs a rendering engine. Your original clips are unchanged.');
      return;
    }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      setNotice('Export is not supported by this browser. Try the latest Chrome or Edge.'); return;
    }
    setExporting(true);
    try {
      const canvas=document.createElement('canvas');
      const [w,h]=aspect==='9:16'?[720,1280]:aspect==='1:1'?[1080,1080]:[1280,720];
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      const loaded=await Promise.all(clips.map(c=>new Promise((resolve,reject)=>{
        const img=new Image(); img.onload=()=>resolve({c,img}); img.onerror=reject; img.src=c.url;
      })));
      const stream=canvas.captureStream(30);
      let audioCtx=null, audioEl=null;
      if(audio?.url){
        audioCtx=new AudioContext(); audioEl=new Audio(audio.url); audioEl.loop=true;
        const src=audioCtx.createMediaElementSource(audioEl); const dest=audioCtx.createMediaStreamDestination();
        src.connect(dest); dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t)); await audioCtx.resume(); await audioEl.play().catch(()=>{});
      }
      const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined); const chunks=[];
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      const stopped=new Promise(resolve=>recorder.onstop=resolve); recorder.start(250);
      const total=clips.reduce((s,c)=>s+c.duration,0); let start=performance.now();
      await new Promise(resolve=>{
        const draw=now=>{
          const t=Math.min(total,(now-start)/1000); let offset=0; let item=loaded[loaded.length-1];
          for(const candidate of loaded){if(t<offset+candidate.c.duration){item=candidate;break;}offset+=candidate.c.duration;}
          ctx.fillStyle='#050711';ctx.fillRect(0,0,w,h);
          const progress=Math.min(1,(t-offset)/item.c.duration); const easedProgress=0.25*progress+0.75*(1-Math.pow(1-progress,1.35)); const scale=Math.max(w/item.img.width,h/item.img.height)*(1+easedProgress*.07);
          const dw=item.img.width*scale,dh=item.img.height*scale;
          ctx.save();ctx.filter=item.c.filter||'none';ctx.drawImage(item.img,(w-dw)/2,(h-dh)/2,dw,dh);ctx.restore();
          const grad=ctx.createLinearGradient(0,h*.5,0,h);grad.addColorStop(0,'transparent');grad.addColorStop(1,'rgba(0,0,0,.65)');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
          if(title){ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold '+Math.round(w*.045)+'px Arial';ctx.fillText(title,w/2,h*.88,w*.85);}
          if(t>=total)resolve();else requestAnimationFrame(draw);
        };requestAnimationFrame(draw);
      });
      recorder.stop(); await stopped; stream.getTracks().forEach(t=>t.stop());
      if(audioEl)audioEl.pause(); if(audioCtx)await audioCtx.close();
      const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});
      if(exportUrl)URL.revokeObjectURL(exportUrl);
      setExportUrl(URL.createObjectURL(blob)); setNotice('Export complete. Download your WebM video below.');
    } catch(e){setNotice(e?.message||'Export failed. Try again in Chrome or Edge.');}
    finally{setExporting(false);}
  };

  const button = (label, icon, onClick, activeState=false) => <button key={label} onClick={onClick} title={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${activeState?'bg-violet-500/25 text-violet-200':'text-slate-300 hover:bg-white/10'}`}>{icon}<span>{label}</span></button>;
  return <div className="min-h-screen bg-[#090b12] text-slate-100">
    <style>{`@keyframes vp-zoom{from{transform:scale(1)}to{transform:scale(1.04)}}@keyframes vp-ken-burns-in{0%{transform:scale(1.02)}100%{transform:scale(1.20)}}@keyframes vp-ken-burns-out{0%{transform:scale(1.20)}100%{transform:scale(1.03)}}@keyframes vp-ken-burns-left{0%{transform:scale(1.16) translateX(6%)}100%{transform:scale(1.16) translateX(-6%)}}@keyframes vp-ken-burns-right{0%{transform:scale(1.12) translateX(-4%)}100%{transform:scale(1.12) translateX(4%)}}@keyframes vp-ken-burns-up{0%{transform:scale(1.16) translateY(6%)}100%{transform:scale(1.16) translateY(-6%)}}@keyframes vp-ken-burns-down{0%{transform:scale(1.12) translateY(-4%)}100%{transform:scale(1.12) translateY(4%)}}@keyframes vp-25d{0%{transform:perspective(1000px) scale(1.05) translate3d(3%,1.2%,0) rotateY(-1.6deg)}50%{transform:perspective(1000px) scale(1.15) translate3d(-3%,-1.6%,0) rotateY(2deg)}100%{transform:perspective(1000px) scale(1.22) translate3d(-4%,1.2%,0) rotateY(1.6deg)}}@keyframes vp-25d-background{0%{transform:scale(1.14) translate3d(-3%,0,0)}50%{transform:scale(1.20) translate3d(3%,2%,0)}100%{transform:scale(1.16) translate3d(4%,-1%,0)}}@keyframes vp-ken-burns-background{0%{transform:scale(1.14) translate3d(3%,0,0)}100%{transform:scale(1.20) translate3d(-3%,0,0)}}@keyframes vp-zoom-out{from{transform:scale(1.035)}to{transform:scale(1.015)}}@keyframes vp-fade{from{opacity:.15}to{opacity:1}}@keyframes vp-ken-burns{0%{transform:scale(1.02) translate(0,0)}100%{transform:scale(1.04) translate(-2%,1%)}}@keyframes vp-float{0%,100%{transform:scale(1.02) translateY(0)}50%{transform:scale(1.055) translateY(-1%)}}@keyframes vp-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}@keyframes vp-flash{0%,100%{opacity:1}50%{opacity:.72}}@keyframes vp-bounce{0%{transform:translateY(10%) scale(.92);opacity:.4}60%{transform:translateY(-2%) scale(1.02);opacity:1}100%{transform:translateY(0) scale(1)}}@keyframes vp-rotate-in{from{transform:rotate(-7deg) scale(.88);opacity:0}to{transform:rotate(0) scale(1);opacity:1}}@keyframes vp-pop{0%{transform:scale(.72);opacity:0}70%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}@keyframes vp-push{from{transform:scale(1.01)}to{transform:scale(1.035)}}@keyframes vp-drift-right{from{transform:scale(1.16) translateX(-4.5%)}to{transform:scale(1.16) translateX(4.5%)}}@keyframes vp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}@keyframes vp-swing{0%,100%{transform:rotate(0)}25%{transform:rotate(1deg)}75%{transform:rotate(-1deg)}}@keyframes vp-blur-reveal{from{filter:blur(12px);opacity:.3;transform:scale(1.04)}to{filter:blur(0);opacity:1;transform:scale(1)}}@keyframes vp-glitch{0%,92%,100%{transform:translate(0)}93%{transform:translate(-3px,1px)}96%{transform:translate(3px,-1px)}}@keyframes vp-transition-fade{from{opacity:0}to{opacity:1}}@keyframes vp-transition-dissolve{0%{opacity:0;filter:blur(8px)}100%{opacity:1;filter:blur(0)}}@keyframes vp-transition-zoom{0%{opacity:0;transform:scale(1.035)}100%{opacity:1;transform:scale(1)}}@keyframes vp-transition-slide{0%{opacity:.2;transform:translateX(9%)}100%{opacity:1;transform:translateX(0)}}@keyframes vp-transition-flash{0%{opacity:0;filter:brightness(2.4)}35%{opacity:1;filter:brightness(1.5)}100%{opacity:1;filter:brightness(1)}}.vp-glow{filter:brightness(1.08) saturate(1.2) drop-shadow(0 0 16px rgba(167,139,250,.55))}.vp-vhs{filter:contrast(1.2) saturate(1.25) sepia(.12)}.vp-dream{filter:brightness(1.08) saturate(.9) blur(.5px)}.vp-vintage{filter:sepia(.32) contrast(1.08) saturate(.78)}.vp-neon{filter:saturate(1.8) contrast(1.15) hue-rotate(8deg) drop-shadow(0 0 8px rgba(56,189,248,.5))}.vp-grain{filter:contrast(1.1) saturate(.9)}.vp-chromatic{filter:saturate(1.5) contrast(1.12) hue-rotate(-8deg) drop-shadow(2px 0 rgba(255,0,100,.35)) drop-shadow(-2px 0 rgba(0,220,255,.3))}.vp-cinema{filter:contrast(1.22) saturate(.86) brightness(.96)}.vp-bloom{filter:brightness(1.12) saturate(1.08) drop-shadow(0 0 10px rgba(255,255,255,.22))}.vp-night{filter:brightness(.8) contrast(1.25) saturate(1.25) hue-rotate(55deg)}.vp-retro{filter:sepia(.22) saturate(.82) contrast(.96) brightness(1.04)}.vp-edge{filter:contrast(1.35) saturate(1.25) drop-shadow(0 0 2px rgba(255,255,255,.25))}`}</style>
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c0f18]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3"><a href="/" className="rounded-lg p-2 hover:bg-white/10" title="Back to VibePulse"><ArrowLeft size={18}/></a><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500"><Clapperboard size={20}/></span><div><div className="font-black tracking-tight">VibePulse <span className="text-violet-300">Studio</span></div><div className="text-[11px] text-slate-500">Professional video workspace</div></div></div>
      <div className="flex flex-wrap items-center gap-2">{button('Undo',<Undo2 size={15}/>,undo)}{button('Redo',<Redo2 size={15}/>,redoEdit)}<select value={aspect} onChange={e=>setAspect(e.target.value)} className="rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"><option>16:9</option><option>9:16</option><option>1:1</option></select><button onClick={exportVideo} disabled={exporting} className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-50"><Download size={16}/>{exporting?'Exporting…':'Export video'}</button></div>
    </header>
    <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)_270px]">
      <aside className="border-b border-white/10 bg-[#0d1019] p-3 lg:border-b-0 lg:border-r">
        <div className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-slate-500">Editor tools</div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">{button('Media',<Film size={17}/>,()=>setPanel('media'),panel==='media')}{button('Audio',<Music2 size={17}/>,()=>setPanel('audio'),panel==='audio')}{button('Text',<Type size={17}/>,()=>setPanel('text'),panel==='text')}{button('Effects',<Sparkles size={17}/>,()=>setPanel('effects'),panel==='effects')}{button('Transitions',<WandSparkles size={17}/>,()=>setPanel('transitions'),panel==='transitions')}</div>
        <div className="mt-5 rounded-xl border border-dashed border-white/15 p-4">
          {panel==='media'&&<><ImagePlus className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Import media</div><p className="my-2 text-xs leading-5 text-slate-500">Add videos and images to your project timeline.</p><button onClick={()=>mediaRef.current?.click()} className="w-full rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold">Import files</button><input ref={mediaRef} type="file" accept="video/*,image/*" multiple hidden onChange={e=>{importFiles(e.target.files);e.target.value='';}}/></>}
          {panel==='audio'&&<><AudioLines className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Audio library</div><p className="my-2 text-xs text-slate-500">Add music or narration.</p><button onClick={()=>audioRef.current?.click()} className="w-full rounded-lg bg-violet-500 px-3 py-2 text-sm font-bold">Import audio</button><input ref={audioRef} type="file" accept="audio/*" hidden onChange={e=>setAudioFile(e.target.files?.[0])}/>{audio&&<div className="mt-3 break-words text-xs text-emerald-300">{audio.name}</div>}</>}
          {panel==='text'&&<><Type className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Title overlay</div><textarea value={title} onChange={e=>setTitle(e.target.value)} placeholder="Type a title or caption…" className="mt-3 min-h-24 w-full rounded-lg border border-white/10 bg-[#171b28] p-2 text-sm outline-none focus:border-violet-400"/><p className="mt-2 text-xs text-slate-500">Title is included in image-sequence exports.</p></>}
          {panel==='effects'&&<><Sparkles className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">AI-style Auto Edit</div><p className="my-2 text-xs leading-5 text-slate-500">One click applies stronger cinematic motion to every photo. No transitions between photos.</p><button onClick={applyAuto} className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 px-3 py-2 text-sm font-bold">✨ AI Auto Edit</button><button onClick={applyProAnimationPack} className="mt-2 w-full rounded-lg border border-violet-400/40 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/10">Apply Pro Motion Pack</button></>}
          {panel==='transitions'&&<><WandSparkles className="mb-2 text-violet-300" size={22}/><div className="text-sm font-semibold">Transitions</div><p className="my-2 text-xs text-slate-500">Transitions are disabled for the documentary look; photos cut directly to the next image.</p>{active&&<select value={active.transition||'Cut'} onChange={e=>changeClip({transition:e.target.value})} className="w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm">{transitions.map(t=><option key={t}>{t}</option>)}</select>}<p className="mt-2 text-xs leading-5 text-slate-500">Transition choice is saved per clip.</p></>}
        </div>
        <div className="mt-5 text-xs text-slate-500">{clips.length} clips · {fmt(duration)} total</div>
      </aside>
      <main className="min-w-0 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between"><div><div className="text-xs uppercase tracking-widest text-slate-500">Preview monitor</div><div className="text-sm text-slate-300">{activeAtTime?.name||'Import media to begin'}</div></div><div className="flex items-center gap-2 text-xs text-slate-500"><span className="rounded bg-white/5 px-2 py-1">{aspect}</span><span>{fmt(playhead)} / {fmt(duration)}</span></div></div>
        <div className="relative mx-auto flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl" style={{aspectRatio:aspect.replace(':',' / '),maxHeight:'56vh',width:'100%'}}>
          {activeAtTime?.type==='video'?<div key={activeAtTime.id} className="absolute inset-0 overflow-hidden bg-black"><video src={activeAtTime.url} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" aria-hidden="true"/><div className="absolute inset-0" style={{animation:previewTransitionAnimation}}><div className={`${effectClass} absolute inset-0 flex items-center justify-center overflow-hidden`} style={{animation:previewAnimation}}><video ref={videoRef} style={{filter:activeAtTime.filter||'none'}} className="block h-full w-full object-contain" controls={false} playsInline onTimeUpdate={e=>{const c=activeAtTime;const before=clips.slice(0,clips.findIndex(x=>x.id===c.id)).reduce((s,x)=>s+x.duration,0);setPlayhead(before+Math.max(0,e.currentTarget.currentTime-(c.trimStart||0)));}}/></div></div></div>:
            activeAtTime?<div key={activeAtTime.id} className="absolute inset-0 overflow-hidden bg-black"><img src={activeAtTime.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" style={{animation:backgroundMotion}}/><div className="absolute inset-0" style={{animation:previewTransitionAnimation}}><div className={`${effectClass} absolute inset-0 flex items-center justify-center overflow-hidden`} style={{animation:previewAnimation}}><img ref={imageRef} src={activeAtTime.url} alt={activeAtTime.name} className="block h-full w-full object-contain" style={{filter:activeAtTime.filter||'none'}}/></div></div></div>:
            <div className="p-8 text-center"><Clapperboard size={48} className="mx-auto mb-4 text-slate-700"/><div className="text-lg font-semibold text-slate-400">Your video preview</div><p className="mt-2 text-sm text-slate-600">Import video or image files to start editing.</p><button onClick={()=>mediaRef.current?.click()} className="mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold">Import media</button></div>}
          {title&&<div className="pointer-events-none absolute inset-x-5 bottom-[10%] text-center text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)] sm:text-3xl">{title}</div>}
        </div>
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-center gap-3">{button(playing?'Pause':'Play',playing?<Pause size={17}/>:<Play size={17}/>,()=>setPlaying(p=>!p))}<button onClick={()=>{setPlayhead(0);setPlaying(false);}} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10">Reset</button><span className="text-xs text-slate-500">Preview playback</span></div>
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1019] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="font-bold">Timeline</div><div className="text-xs text-slate-500">Select clips · reorder · trim source duration</div></div><button onClick={()=>mediaRef.current?.click()} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"><Plus size={14}/> Add media</button></div>
          <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500"><span>00:00</span><span>{fmt(duration)}</span></div>
          <div ref={timelineRef} onClick={seekTimeline} className="relative mb-3 h-4 cursor-crosshair rounded bg-[#202638]"><div className="absolute inset-y-0 left-0 rounded bg-violet-500/30" style={{width:`${playhead/duration*100}%`}}/><div className="absolute -top-1 bottom-[-5px] z-10 w-[2px] bg-pink-300" style={{left:`${playhead/duration*100}%`}}/></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] font-bold uppercase text-slate-500">Video</span><div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">{clips.map((c,i)=><button key={c.id} onClick={()=>{setSelected(c.id);setPlayhead(clips.slice(0,i).reduce((s,x)=>s+x.duration,0));}} className={`relative h-[72px] min-w-[105px] flex-1 overflow-hidden rounded-lg border text-left ${selected===c.id?'border-violet-400 ring-1 ring-violet-400':'border-white/10'}`} style={{flexGrow:c.duration,flexBasis:`${Math.max(90,c.duration*25)}px`}}>{c.type==='image'?<img src={c.url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{filter:c.filter}}/>:<video src={c.url} muted className="absolute inset-0 h-full w-full object-cover" preload="metadata"/>}<span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-[10px]">{c.name}</span><span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px]">{fmt(c.duration)}</span></button>)}</div></div>
            <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] font-bold uppercase text-slate-500">Audio</span><div className="flex h-10 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs text-emerald-200"><AudioLines size={15}/><span className="truncate">{audio?.name||'Import audio to add a music track'}</span></div></div>
            <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] font-bold uppercase text-slate-500">Text</span><div className="flex h-8 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border border-pink-500/25 bg-pink-500/10 px-3 text-xs text-pink-200"><Type size={13}/><span className="truncate">{title||'No title overlay'}</span></div></div>
          </div>
          {clips.length>0&&<div className="mt-3 flex flex-wrap gap-2">{clips.map((c,i)=><div key={c.id} className="flex items-center gap-1 rounded-lg bg-white/5 p-1"><button onClick={()=>moveClip(i,-1)} disabled={!i} className="rounded px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-20">←</button><button onClick={()=>moveClip(i,1)} disabled={i===clips.length-1} className="rounded px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-20">→</button><button onClick={()=>removeClip(c.id)} className="rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/20" title="Remove clip"><Trash2 size={13}/></button></div>)}</div>}
        </section>
        {notice&&<div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/10 p-3 text-sm text-violet-100">{notice}</div>}
        {exportUrl&&<a href={exportUrl} download="vibepulse-studio.webm" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black"><Download size={16}/> Download exported video</a>}
      </main>
      <aside className="border-t border-white/10 bg-[#0d1019] p-4 lg:border-l lg:border-t-0">
        <div className="mb-4 flex items-center gap-2"><Settings2 size={17} className="text-violet-300"/><div className="font-bold">Inspector</div></div>
        {active?<><div className="mb-4 break-words text-sm font-semibold">{active.name}</div><div className="mb-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/5 p-2"><div className="text-slate-500">Media type</div><div className="mt-1 font-semibold">{active.type==='video'?'Video clip':'Image clip'}</div></div><div className="rounded-lg bg-white/5 p-2"><div className="text-slate-500">Clip length</div><div className="mt-1 font-semibold">{fmt(active.duration)}</div></div></div>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Timeline duration (seconds)</label><input type="number" min=".5" max="120" step=".5" value={active.duration} onChange={e=>changeClip({duration:Math.max(.5,Math.min(120,Number(e.target.value)||.5))})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"/>
          {active.type==='video'&&<><label className="mb-2 block text-xs font-semibold text-slate-400">Source trim start (seconds)</label><input type="number" min="0" step=".1" value={active.trimStart} onChange={e=>changeClip({trimStart:Math.max(0,Number(e.target.value)||0)})} className="mb-3 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"/><label className="mb-2 block text-xs font-semibold text-slate-400">Playback speed</label><select value={active.speed} onChange={e=>changeClip({speed:Number(e.target.value)})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"><option value="0.5">0.5× slow</option><option value="1">1× normal</option><option value="1.5">1.5×</option><option value="2">2×</option></select></>}
          {active.type==='video'&&<><label className="mb-2 block text-xs font-semibold text-slate-400">Source trim end (seconds)</label><input type="number" min={active.trimStart+.1} step=".1" value={active.trimEnd??active.duration} onChange={e=>changeClip({trimEnd:Math.max(active.trimStart+.1,Number(e.target.value)||active.trimStart+.1),duration:Math.max(.5,(Number(e.target.value)||active.trimStart+.1)-active.trimStart)})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm"/></>}
          <label className="mb-2 block text-xs font-semibold text-slate-400">Color / filter</label><div className="mb-4 grid grid-cols-2 gap-2">{filters.map(([name,value])=><button key={name} onClick={()=>changeClip({filter:value})} className={`rounded-lg border px-2 py-2 text-xs ${active.filter===value?'border-violet-400 bg-violet-500/15':'border-white/10 hover:bg-white/5'}`}>{name}</button>)}</div>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Motion animation</label><select value={active.animation||'none'} onChange={e=>changeClip({animation:e.target.value})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm">{animations.map(([name,value])=><option key={value} value={value}>{name}</option>)}</select>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Visual effects</label><div className="mb-4 grid grid-cols-2 gap-2">{visualEffects.map(([name,value])=><button key={value} onClick={()=>changeClip({effect:value})} className={`rounded-lg border px-2 py-2 text-xs ${(active.effect||'none')===value?'border-violet-400 bg-violet-500/15':'border-white/10 hover:bg-white/5'}`}>{name}</button>)}</div>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Transition into clip</label><select value={active.transition||'Cut'} onChange={e=>changeClip({transition:e.target.value})} className="mb-4 w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm">{transitions.map(t=><option key={t}>{t}</option>)}</select>
          <label className="mb-2 block text-xs font-semibold text-slate-400">Clip volume</label><div className="mb-4 flex items-center gap-2"><Volume2 size={15}/><input type="range" min="0" max="100" value={active.volume} onChange={e=>changeClip({volume:Number(e.target.value)})} className="w-full"/><span className="text-xs">{active.volume}%</span></div>
          <button onClick={()=>removeClip(active.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 size={15}/> Delete selected clip</button>
        </>:<div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Select a timeline clip to edit its properties.</div>}
        <div className="mt-6 rounded-xl bg-white/[.03] p-3 text-xs leading-5 text-slate-500"><Scissors size={16} className="mb-2 text-violet-300"/><div className="font-semibold text-slate-300">Editing controls</div>Timeline duration, source trim, playback speed, filters, motion animations, visual effects, transitions, clip volume, clip ordering and deletion are available here. Video exports that require encoding original video clips need a dedicated render backend.</div>
      </aside>
    </div>
  </div>;
}
