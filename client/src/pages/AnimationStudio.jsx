import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './AnimationStudio.css';
import { ArrowLeft, Save, FolderOpen, ImagePlus, Play, Pause, Square, Plus, Trash2, Copy, RotateCw, Download, Layers3, MousePointer2, Hand, Pencil, Undo2, Redo2, ChevronDown, Film, Settings2, Maximize2 } from 'lucide-react';

const W = 1280, H = 720, FPS = 24, TOTAL_FRAMES = 240;
const uid = () => globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random());
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function interpolate(keys, frame) {
  if (!keys?.length) return null;
  const sorted = [...keys].sort((a,b) => a.frame-b.frame);
  if (frame <= sorted[0].frame) return sorted[0];
  if (frame >= sorted[sorted.length-1].frame) return sorted[sorted.length-1];
  let i = 0;
  while (i < sorted.length-1 && sorted[i+1].frame < frame) i++;
  const a = sorted[i], b = sorted[i+1], t = (frame-a.frame)/Math.max(1,b.frame-a.frame);
  return { frame, x:lerp(a.x,b.x,t), y:lerp(a.y,b.y,t), scale:lerp(a.scale,b.scale,t), rotation:lerp(a.rotation,b.rotation,t), opacity:lerp(a.opacity ?? 1,b.opacity ?? 1,t) };
}

function paintScene(ctx, layers, frame, images, includeGrid = false) {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#f5f6fa'; ctx.fillRect(0,0,W,H);
  if (includeGrid) {
    ctx.save(); ctx.strokeStyle = '#e4e7ee'; ctx.lineWidth = 1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();
  }
  layers.filter(l=>l.visible).forEach(layer=>{
    const state = interpolate(layer.keys, frame) || layer;
    const img = images[layer.assetId || layer.id];
    if (layer.kind === 'image' && img?.complete && img.naturalWidth) {
      const scale = state.scale ?? 1, iw=img.naturalWidth*scale, ih=img.naturalHeight*scale;
      ctx.save(); ctx.globalAlpha=state.opacity ?? 1; ctx.translate(state.x ?? W/2, state.y ?? H/2); ctx.rotate((state.rotation||0)*Math.PI/180);
      ctx.drawImage(img,-iw/2,-ih/2,iw,ih);
      if (layer.rigged && layer.mouthEnabled !== false) {
        const mx = Number(layer.mouthX ?? 0) * scale;
        const my = Number(layer.mouthY ?? (-img.naturalHeight * 0.12)) * scale;
        const mw = Math.max(12, Number(layer.mouthWidth ?? img.naturalWidth * 0.12) * scale);
        const mh = Math.max(5, Number(layer.mouthHeight ?? img.naturalHeight * 0.035) * scale) * (layer.mouthOpen ? 1.8 : 0.65);
        ctx.save();
        ctx.fillStyle = '#241015'; ctx.strokeStyle = '#1b1012'; ctx.lineWidth = Math.max(1, 1.5 * scale);
        ctx.beginPath(); ctx.ellipse(mx, my, mw / 2, mh / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (layer.mouthOpen) { ctx.fillStyle = '#d95a72'; ctx.beginPath(); ctx.ellipse(mx, my + mh * .22, mw * .22, mh * .16, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (layer.selected) { ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.strokeRect(-iw/2,-ih/2,iw,ih); }
      ctx.restore();
    } else if (layer.kind === 'drawing' && layer.points?.length > 1) {
      ctx.save(); ctx.strokeStyle=layer.color||'#111827'; ctx.lineWidth=layer.brushSize||5; ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
      layer.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
    }
  });
}

export default function AnimationStudio() {
  const canvasRef=useRef(null), stageWrapRef=useRef(null), imagesRef=useRef({}), rafRef=useRef(0), mediaRecorderRef=useRef(null), chunksRef=useRef([]);
  const [layers,setLayers]=useState([]), [selectedId,setSelectedId]=useState(null), [frame,setFrame]=useState(0), [playing,setPlaying]=useState(false), [tool,setTool]=useState('select');
  const [projectName,setProjectName]=useState('Untitled Cartoon'), [zoom,setZoom]=useState(0.72), [assets,setAssets]=useState([]), [status,setStatus]=useState('Ready');
  const [history,setHistory]=useState([]), [future,setFuture]=useState([]), [showExport,setShowExport]=useState(false);
  const [speechText,setSpeechText]=useState('Hello! Welcome to my cartoon world.'); const [voiceRate,setVoiceRate]=useState(0.92); const [mouthOpen,setMouthOpen]=useState(false); const [mouthOffsetX,setMouthOffsetX]=useState(0); const [mouthOffsetY,setMouthOffsetY]=useState(0); const [rigEnabled,setRigEnabled]=useState(true); const speechTimer=useRef(null);
  const selected=layers.find(l=>l.id===selectedId)||null;
  const duration=TOTAL_FRAMES/FPS;

  const snapshot = useCallback((next) => { setHistory(h=>[...h.slice(-39), layers]); setFuture([]); setLayers(next); },[layers]);
  const updateLayer = useCallback((id, patch, record=true) => {
    setLayers(prev=>prev.map(l=>l.id===id?{...l,...patch}:l));
  },[]);
  const render = useCallback((f=frame, currentLayers=layers, grid=false) => {
    const canvas=canvasRef.current; if(!canvas)return;
    const ctx=canvas.getContext('2d'); paintScene(ctx,currentLayers,f,imagesRef.current,grid);
  },[frame,layers]);
  useEffect(()=>{render(frame,layers,tool==='select');},[render,frame,layers,tool]);
  useEffect(()=>{if(!playing)return; let last=performance.now(),acc=0; const tick=(now)=>{acc+=now-last;last=now;const step=1000/FPS;if(acc>=step){setFrame(f=>{const n=f+Math.floor(acc/step);return n>=TOTAL_FRAMES?0:n;});acc%=step;}rafRef.current=requestAnimationFrame(tick);};rafRef.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(rafRef.current);},[playing]);
  useEffect(()=>{document.title='VibePulse Animation Studio';return()=>{document.title='VibePulse';Object.values(imagesRef.current).forEach(i=>{if(i.src?.startsWith('blob:'))URL.revokeObjectURL(i.src);});};},[]);
  useEffect(()=>{
    const id='builtin-vibepulse-cartoon';
    const img=new Image();
    img.onload=()=>{imagesRef.current[id]=img;setAssets(prev=>prev.some(a=>a.id===id)?prev:[{id,name:'VibePulse Cartoon Character',kind:'image',url:'/characters/vibepulse-cartoon-character.svg'},...prev]);render();};
    img.onerror=()=>setStatus('Default character asset could not load');
    img.src='/characters/vibepulse-cartoon-character.svg';
  },[]);

  const addFiles=async(files)=>{
    const accepted=Array.from(files||[]).filter(f=>f.type.startsWith('image/'));
    if(!accepted.length){setStatus('Choose image files (PNG, JPG, WEBP).');return;}
    const newAssets=[];
    for(const file of accepted){
      const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
      const id=uid(),img=new Image();img.onload=()=>{imagesRef.current[id]=img;render();};img.src=dataUrl;
      const asset={id,name:file.name,dataUrl,kind:'image'};newAssets.push(asset);
    }
    setAssets(a=>[...a,...newAssets]);setStatus(`${newAssets.length} image asset(s) imported`);
  };
  const addToStage=(asset)=>{
    const img=imagesRef.current[asset.id];
    const add={id:uid(),assetId:asset.id,name:asset.name,kind:'image',visible:true,locked:false,x:W/2,y:H/2,scale:img?Math.min(400/img.naturalWidth,480/img.naturalHeight,1):0.5,rotation:0,opacity:1,keys:[],rigged:false,mouthEnabled:true,mouthOpen:false,mouthX:0,mouthY:img?-(img.naturalHeight*.30):-300,mouthX:0,mouthWidth:img?img.naturalWidth*.14:60,mouthHeight:img?img.naturalHeight*.04:20};
    snapshot([...layers,add]);setSelectedId(add.id);setStatus('Character/image added to stage');
  };
  const rigCharacter=()=>{if(!selected||selected.kind!=='image'){setStatus('Select a character image layer first');return;} updateLayer(selected.id,{rigged:true,mouthEnabled:true,mouthY:selected.mouthY??60});setStatus('Basic mouth rig enabled. Adjust mouth position for your character.');};
  const speakAsCharacter=()=>{if(!('speechSynthesis' in window)){setStatus('Speech generation is not supported in this browser');return;}if(!selected||selected.kind!=='image'){setStatus('Select a character image first');return;}window.speechSynthesis.cancel();if(speechTimer.current)clearInterval(speechTimer.current);updateLayer(selected.id,{rigged:true,mouthEnabled:true,mouthOpen:false});const utterance=new SpeechSynthesisUtterance(speechText);utterance.rate=voiceRate;utterance.pitch=1.08;utterance.onstart=()=>{let open=false;speechTimer.current=setInterval(()=>{open=!open;setMouthOpen(open);setLayers(prev=>prev.map(l=>l.id===selected.id?{...l,rigged:true,mouthEnabled:true,mouthOpen:open}:l));},105);setStatus('Character voice playing with animated mouth');};utterance.onend=()=>{clearInterval(speechTimer.current);setMouthOpen(false);setLayers(prev=>prev.map(l=>l.id===selected.id?{...l,mouthOpen:false}:l));setStatus('Voice playback finished');};window.speechSynthesis.speak(utterance);};
  const stopSpeech=()=>{window.speechSynthesis?.cancel();if(speechTimer.current)clearInterval(speechTimer.current);setMouthOpen(false);setLayers(prev=>prev.map(l=>({...l,mouthOpen:false})));setStatus('Voice stopped');};
  const makeWalkCycle=()=>{if(!selected||selected.kind!=='image'){setStatus('Select a character image first');return;}const startX=selected.x??W/2,startY=selected.y??H/2,base=frame;const keys=[{frame:base,x:startX,y:startY,scale:selected.scale??1,rotation:selected.rotation??0,opacity:selected.opacity??1},{frame:Math.min(TOTAL_FRAMES-1,base+12),x:startX+35,y:startY-9,scale:selected.scale??1,rotation:-3,opacity:selected.opacity??1},{frame:Math.min(TOTAL_FRAMES-1,base+24),x:startX+70,y:startY,scale:selected.scale??1,rotation:3,opacity:selected.opacity??1},{frame:Math.min(TOTAL_FRAMES-1,base+36),x:startX+105,y:startY-9,scale:selected.scale??1,rotation:-3,opacity:selected.opacity??1},{frame:Math.min(TOTAL_FRAMES-1,base+48),x:startX+140,y:startY,scale:selected.scale??1,rotation:0,opacity:selected.opacity??1}].filter((k,i,a)=>i===0||k.frame>a[i-1].frame);updateLayer(selected.id,{keys:[...(selected.keys||[]).filter(k=>k.frame<base),...keys]});setStatus('Walk-cycle motion keyframes added; adjust poses for a more natural walk');};
  const addKeyframe=()=>{
    if(!selected)return;
    const state={frame,x:selected.x??W/2,y:selected.y??H/2,scale:selected.scale??1,rotation:selected.rotation??0,opacity:selected.opacity??1};
    const keys=[...(selected.keys||[]).filter(k=>k.frame!==frame),state].sort((a,b)=>a.frame-b.frame);
    updateLayer(selected.id,{keys});setStatus(`Keyframe set at ${frame}f`);
  };
  const addBlankDrawing=()=>{const layer={id:uid(),name:'Drawing '+(layers.filter(l=>l.kind==='drawing').length+1),kind:'drawing',visible:true,locked:false,points:[],color:'#111827',brushSize:5,keys:[]};snapshot([...layers,layer]);setSelectedId(layer.id);setTool('brush');};
  const pointerPos=(e)=>{const c=canvasRef.current,r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};};
  const onPointerDown=(e)=>{if(tool==='brush'){let p=pointerPos(e);const id=selected?.kind==='drawing'?selected.id:null;if(!id){addBlankDrawing();setTimeout(()=>setLayers(prev=>{const last=prev[prev.length-1];if(last?.kind==='drawing')return prev.map(l=>l.id===last.id?{...l,points:[p]}:l);return prev;}),0);}else updateLayer(id,{points:[...(selected.points||[]),p]});e.currentTarget.setPointerCapture(e.pointerId);return;} if(tool==='hand')return;const p=pointerPos(e);const hit=[...layers].reverse().find(l=>l.kind==='image'&&l.visible&&Math.abs(p.x-(l.x||W/2))<Math.max(45,180*(l.scale||1))&&Math.abs(p.y-(l.y||H/2))<Math.max(55,220*(l.scale||1)));if(hit&&!hit.locked){setSelectedId(hit.id);canvasRef.current.dataset.drag=hit.id;canvasRef.current.dataset.px=p.x;canvasRef.current.dataset.py=p.y;}else setSelectedId(null);e.currentTarget.setPointerCapture(e.pointerId);};
  const onPointerMove=(e)=>{if(tool==='brush'&&e.buttons){const p=pointerPos(e);setLayers(prev=>{const id=selectedId||prev[prev.length-1]?.id;return prev.map(l=>l.id===id&&l.kind==='drawing'?{...l,points:[...(l.points||[]),p]}:l);});return;}const c=canvasRef.current,id=c?.dataset.drag;if(e.buttons&&id){const p=pointerPos(e),dx=p.x-Number(c.dataset.px),dy=p.y-Number(c.dataset.py);setLayers(prev=>prev.map(l=>l.id===id?{...l,x:(l.x||W/2)+dx,y:(l.y||H/2)+dy}:l));c.dataset.px=p.x;c.dataset.py=p.y;}};
  const deleteSelected=()=>{if(!selected)return;snapshot(layers.filter(l=>l.id!==selected.id));setSelectedId(null);setStatus('Layer deleted');};
  const undo=()=>{if(!history.length)return;setFuture(f=>[layers,...f]);setLayers(history[history.length-1]);setHistory(h=>h.slice(0,-1));};
  const redo=()=>{if(!future.length)return;setHistory(h=>[...h,layers]);setLayers(future[0]);setFuture(f=>f.slice(1));};
  const saveProject=()=>{const project={format:'vibepulse-animation-project',version:1,projectName,width:W,height:H,fps:FPS,totalFrames:TOTAL_FRAMES,assets,layers,frame};const blob=new Blob([JSON.stringify(project)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(projectName||'animation').replace(/[^a-z0-9-_]/gi,'_')+'.vpa.json';a.click();URL.revokeObjectURL(a.href);setStatus('Project saved as editable JSON');};
  const openProject=async(file)=>{try{const project=JSON.parse(await file.text());if(project.format!=='vibepulse-animation-project')throw new Error('Unsupported project file');imagesRef.current={};const restoredAssets=project.assets||[];restoredAssets.forEach(a=>{if(a.dataUrl){const im=new Image();im.onload=()=>{imagesRef.current[a.id]=im;render(project.frame||0,project.layers||[]);};im.src=a.dataUrl;}});setAssets(restoredAssets);setLayers(project.layers||[]);setFrame(project.frame||0);setProjectName(project.projectName||'Untitled Cartoon');setStatus('Project opened');}catch(e){setStatus('Could not open project: '+e.message);}};
  const exportWebM=async()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');const stream=c.captureStream(FPS);let audioCtx=null;try{const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});chunksRef.current=[];rec.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data);};rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:'video/webm'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(projectName||'animation')+'.webm';a.click();URL.revokeObjectURL(a.href);setStatus('WebM export complete');setPlaying(false);setFrame(0);};mediaRecorderRef.current=rec;rec.start();setStatus('Rendering animation…');let f=0;const step=()=>{paintScene(ctx,layers,f,imagesRef.current,false);f++;if(f<TOTAL_FRAMES){setTimeout(step,1000/FPS);}else rec.stop();};step();}catch(e){setStatus('WebM export failed in this browser: '+e.message);}};
  const selectedState=selected?interpolate(selected.keys,frame)||selected:null;
  const timelineTicks=useMemo(()=>Array.from({length:11},(_,i)=>i*24),[]);
  return <div className="vp-anim-shell">
    <header className="vp-anim-top">
      <Link to="/" className="vp-anim-back" title="Back to VibePulse"><ArrowLeft size={17}/></Link>
      <div className="vp-anim-brand"><span className="vp-anim-mark">V</span><div><strong>VibePulse</strong><small>ANIMATION STUDIO</small></div></div>
      <span className="vp-anim-sep"/>
      <input className="vp-anim-project-name" value={projectName} onChange={e=>setProjectName(e.target.value)} aria-label="Project name"/>
      <div className="vp-anim-top-actions"><Link to="/dhaka-drive" className="vp-anim-button">Play Dhaka 3D</Link><button onClick={undo} title="Undo"><Undo2 size={16}/></button><button onClick={redo} title="Redo"><Redo2 size={16}/></button><button onClick={saveProject}><Save size={16}/> Save</button><label className="vp-anim-button"><FolderOpen size={16}/> Open<input hidden type="file" accept=".json,.vpa.json,application/json" onChange={e=>e.target.files?.[0]&&openProject(e.target.files[0])}/></label><button className="vp-anim-export" onClick={()=>setShowExport(true)}><Download size={16}/> Export</button></div>
    </header>
    <div className="vp-anim-menu"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Modify</span><span>Control</span><span>Window</span><span>Help</span><div className="vp-anim-status">{status}</div></div>
    <div className="vp-anim-workspace">
      <aside className="vp-anim-left">
        <div className="vp-anim-panel-title">TOOLS <ChevronDown size={13}/></div>
        <div className="vp-anim-tools">{[[MousePointer2,'select','Selection'],[Hand,'hand','Hand'],[Pencil,'brush','Brush']].map(([Icon,id,label])=><button key={id} className={tool===id?'active':''} onClick={()=>id==='brush'&&selected?.kind!=='drawing'?addBlankDrawing():setTool(id)} title={label}><Icon size={18}/></button>)}</div>
        <div className="vp-anim-panel-title">PROJECT ASSETS <label title="Import images"><ImagePlus size={15}/><input hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>addFiles(e.target.files)}/></label></div>
        <label className="vp-anim-import"><ImagePlus size={19}/><span>Import images / characters<small>PNG · JPG · WEBP</small></span><input hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>addFiles(e.target.files)}/></label>
        <div className="vp-anim-assets">{assets.map(a=><button className="vp-anim-asset" key={a.id} onDoubleClick={()=>addToStage(a)} onClick={()=>addToStage(a)} title="Click to add to stage"><img src={a.dataUrl||a.url} alt=""/><span>{a.name}</span><Plus size={14} onClick={e=>{e.stopPropagation();addToStage(a);}}/></button>)}</div>
        <div className="vp-anim-panel-title">QUICK ACTIONS</div>
        <button className="vp-anim-wide-action" onClick={addBlankDrawing}><Pencil size={15}/> New drawing layer</button>
        <button className="vp-anim-wide-action" onClick={()=>{if(selected){snapshot([...layers,{...selected,id:uid(),name:selected.name+' copy',x:(selected.x||W/2)+30,y:(selected.y||H/2)+30,keys:selected.keys.map(k=>({...k}))}]);setStatus('Layer duplicated');}}}><Copy size={15}/> Duplicate selected</button>
      </aside>
      <main className="vp-anim-center">
        <div className="vp-anim-stagebar"><span><Film size={15}/> Stage <b>{W} × {H}</b></span><div><button onClick={()=>setZoom(z=>clamp(z-.1,.25,1.2))}>−</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>clamp(z+.1,.25,1.2))}>+</button><button title="Fit stage" onClick={()=>setZoom(.72)}><Maximize2 size={14}/></button></div></div>
        <div className="vp-anim-stage-wrap" ref={stageWrapRef}><div className="vp-anim-canvas-holder" style={{width:W*zoom,height:H*zoom}}><canvas ref={canvasRef} width={W} height={H} style={{width:'100%',height:'100%',touchAction:'none',cursor:tool==='brush'?'crosshair':tool==='hand'?'grab':'default'}} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={()=>{if(canvasRef.current)delete canvasRef.current.dataset.drag;}}/></div></div>
        <div className="vp-anim-transport"><button onClick={()=>setFrame(0)} title="Go to start"><Square size={14}/></button><button className="vp-anim-play" onClick={()=>setPlaying(p=>!p)} title={playing?'Pause':'Play'}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><button onClick={()=>setFrame(f=>Math.max(0,f-1))}>‹</button><button onClick={()=>setFrame(f=>Math.min(TOTAL_FRAMES-1,f+1))}>›</button><span className="vp-anim-timecode">{String(Math.floor(frame/FPS)).padStart(2,'0')}:{String(Math.floor(frame%FPS*100/FPS)).padStart(2,'0')} <small>/ {duration.toFixed(2)}s</small></span><input type="range" min="0" max={TOTAL_FRAMES-1} value={frame} onChange={e=>setFrame(Number(e.target.value))}/><span>Frame {frame}</span></div>
      </main>
      <aside className="vp-anim-right">
        <div className="vp-anim-panel-title">PROPERTIES <Settings2 size={14}/></div>
        {!selected?<div className="vp-anim-empty">Select a layer on the stage or timeline to edit its properties.</div>:<div className="vp-anim-properties">
          <label>Layer name<input value={selected.name} onChange={e=>updateLayer(selected.id,{name:e.target.value})}/></label>
          <div className="vp-anim-prop-grid">{[['X','x',0,W],['Y','y',0,H],['Scale','scale',.05,4],['Rotation','rotation',-360,360],['Opacity','opacity',0,1]].map(([label,key,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} step={key==='scale'?.05:key==='opacity'?.05:1} value={Number((selectedState||selected)[key]??(key==='scale'?1:0))} onChange={e=>updateLayer(selected.id,{[key]:clamp(Number(e.target.value),min,max)})}/></label>)}</div>
          <button className="vp-anim-keyframe" onClick={addKeyframe}>◆ Set keyframe at frame {frame}</button>
          <p className="vp-anim-hint">Set two or more keyframes at different frames to animate position, scale, rotation and opacity.</p>
          <div className="vp-anim-prop-buttons"><button onClick={()=>updateLayer(selected.id,{visible:!selected.visible})}>{selected.visible?'Hide layer':'Show layer'}</button><button onClick={()=>updateLayer(selected.id,{locked:!selected.locked})}>{selected.locked?'Unlock':'Lock'}</button><button className="danger" onClick={deleteSelected}><Trash2 size={14}/> Delete</button></div>
          <div className="vp-anim-key-list"><b>KEYFRAMES</b>{(selected.keys||[]).length===0?<small>No keyframes yet</small>:[...selected.keys].sort((a,b)=>a.frame-b.frame).map(k=><button key={k.frame} onClick={()=>setFrame(k.frame)}>◆ Frame {k.frame}</button>)}</div>
        </div>}
        <div className="vp-anim-panel-title">CHARACTER & VOICE <span>2D</span></div>
        <div className="vp-anim-character-tools">
          <button onClick={rigCharacter}>◎ Rig selected character mouth</button>
          <label>Voice script<textarea value={speechText} onChange={e=>setSpeechText(e.target.value)} rows="3" placeholder="Type what your character should say…"/></label>
          <label>Voice speed <span>{voiceRate.toFixed(2)}×</span><input type="range" min="0.65" max="1.35" step="0.05" value={voiceRate} onChange={e=>setVoiceRate(Number(e.target.value))}/></label>
          <div className="vp-anim-character-buttons"><button onClick={speakAsCharacter}>▶ Speak + lip movement</button><button onClick={stopSpeech}>■ Stop</button></div>
          <button onClick={makeWalkCycle}>↔ Create walk motion</button>
          {selected?.kind==='image'&&selected.rigged&&<>
            <label>Mouth horizontal position <span>{Math.round(selected.mouthX??0)}</span><input type="range" min={-180} max={180} value={selected.mouthX??0} onChange={e=>updateLayer(selected.id,{mouthX:Number(e.target.value)})}/></label>
            <label>Mouth vertical position <span>{Math.round(selected.mouthY??0)}</span><input type="range" min={-260} max={260} value={selected.mouthY??0} onChange={e=>updateLayer(selected.id,{mouthY:Number(e.target.value)})}/></label>
            <label>Mouth width <span>{Math.round(selected.mouthWidth??36)}</span><input type="range" min="10" max="180" value={selected.mouthWidth??36} onChange={e=>updateLayer(selected.id,{mouthWidth:Number(e.target.value)})}/></label>
            <label>Mouth height <span>{Math.round(selected.mouthHeight??12)}</span><input type="range" min="4" max="70" value={selected.mouthHeight??12} onChange={e=>updateLayer(selected.id,{mouthHeight:Number(e.target.value)})}/></label>
          </>}
          <small>Basic voice/lip movement is a starter rig, not phoneme-accurate lip-sync. Place the mouth on your character and test it.</small>
        </div>
        <div className="vp-anim-panel-title">LAYERS <span>{layers.length}</span></div>
        <div className="vp-anim-layers">{[...layers].reverse().map(l=><div key={l.id} className={'vp-anim-layer '+(selectedId===l.id?'selected':'')}><button className="vp-anim-layer-main" onClick={()=>setSelectedId(l.id)}><span className="vp-anim-layer-icon">{l.kind==='drawing'?'✎':'▧'}</span><span>{l.name}</span></button><button title={l.visible?'Hide':'Show'} onClick={()=>updateLayer(l.id,{visible:!l.visible})}>{l.visible?'◉':'○'}</button></div>)}</div>
      </aside>
    </div>
    <section className="vp-anim-timeline">
      <div className="vp-anim-timeline-head"><div><Layers3 size={15}/> TIMELINE <span>{layers.length} layers</span></div><div><button onClick={()=>setFrame(0)}>⏮</button><button onClick={()=>setFrame(f=>Math.max(0,f-1))}>◀</button><button onClick={()=>setFrame(f=>Math.min(TOTAL_FRAMES-1,f+1))}>▶</button><button onClick={addKeyframe}>◆ Keyframe</button><button onClick={()=>setPlaying(p=>!p)}>{playing?'Pause':'Play'}</button></div></div>
      <div className="vp-anim-timeline-body"><div className="vp-anim-track-labels"><div>Frame</div>{[...layers].reverse().map(l=><button key={l.id} className={selectedId===l.id?'active':''} onClick={()=>setSelectedId(l.id)}>{l.kind==='drawing'?'✎':'▧'} {l.name}</button>)}{!layers.length&&<div className="vp-anim-track-placeholder">Import an image and double-click it to create your first layer.</div>}</div>
        <div className="vp-anim-ruler-area"><div className="vp-anim-ruler">{timelineTicks.map(f=><span key={f} style={{left:(f/(TOTAL_FRAMES-1))*100+'%'}}>{(f/FPS).toFixed(0)}s</span>)}</div>{[...layers].reverse().map(l=><div key={l.id} className={'vp-anim-track '+(selectedId===l.id?'active':'')} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setFrame(clamp(Math.round((e.clientX-r.left)/r.width*(TOTAL_FRAMES-1)),0,TOTAL_FRAMES-1));setSelectedId(l.id);}}><div className="vp-anim-clip" style={{left:'0%',width:'100%'}}><span>{l.name}</span>{(l.keys||[]).map(k=><i key={k.frame} title={'Frame '+k.frame} style={{left:(k.frame/(TOTAL_FRAMES-1))*100+'%'}}/> )}</div></div>)}<div className="vp-anim-playhead" style={{left:(frame/(TOTAL_FRAMES-1))*100+'%'}}><b/></div></div>
      </div>
    </section>
    {showExport&&<div className="vp-anim-modal-backdrop" onClick={()=>setShowExport(false)}><div className="vp-anim-modal" onClick={e=>e.stopPropagation()}><h2>Export Animation</h2><p>Render the full {duration.toFixed(0)}-second timeline using the browser's canvas recorder.</p><div className="vp-anim-export-option"><b>WebM Video</b><span>720p · 24 FPS · current layers and keyframes</span><button onClick={()=>{setShowExport(false);exportWebM();}}>Render WebM</button></div><div className="vp-anim-export-option"><b>Editable project</b><span>Save layers, keyframes, and imported image assets</span><button onClick={()=>{setShowExport(false);saveProject();}}>Save Project JSON</button></div><p className="vp-anim-hint">MP4/H.264 export and audio mixing require a separate encoder pipeline; they are not falsely presented as available in this first editor build.</p><button className="vp-anim-modal-close" onClick={()=>setShowExport(false)}>Close</button></div></div>}
  </div>;
}
