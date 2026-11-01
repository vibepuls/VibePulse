import { useEffect, useRef, useState } from 'react';
import { ArrowUp, CarFront, Map, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

const W=1200,H=720, WORLD_W=5200, WORLD_H=5200;
const districts=[
 {name:'Gulshan Avenue',x:300,y:300,w:1100,h:900,kind:'modern'},
 {name:'Banani',x:1700,y:300,w:900,h:800,kind:'modern'},
 {name:'Farmgate',x:900,y:1700,w:1100,h:850,kind:'busy'},
 {name:'Shahbagh',x:2200,y:1700,w:800,h:900,kind:'green'},
 {name:'Old Dhaka',x:300,y:3200,w:1500,h:1000,kind:'old'},
 {name:'Sadarghat',x:2000,y:4100,w:1500,h:700,kind:'river'},
 {name:'Motijheel',x:3300,y:1800,w:1100,h:1100,kind:'modern'},
 {name:'Mirpur',x:3400,y:400,w:1300,h:1000,kind:'busy'},
 {name:'Airport Road',x:3300,y:3200,w:1500,h:700,kind:'busy'}
];
const landmarks=[{name:'Lalbagh Fort',x:740,y:3670,icon:'🏰'},{name:'Ahsan Manzil',x:2300,y:4370,icon:'🏛️'},{name:'Sadarghat Launch Terminal',x:2980,y:4550,icon:'⛴️'},{name:'Shahbagh',x:2500,y:2050,icon:'🌳'},{name:'National Parliament',x:1350,y:1400,icon:'🏛️'},{name:'Gulshan Circle 2',x:900,y:650,icon:'🏙️'},{name:'Farmgate',x:1400,y:1900,icon:'🚦'},{name:'Mirpur Stadium',x:4300,y:700,icon:'🏟️'}];
const rand=(a,b)=>a+Math.random()*(b-a);
function makeCity(){
 const roads=[];
 for(let y=150;y<WORLD_H;y+=350) roads.push({x:0,y,w:WORLD_W,h:82,horiz:true});
 for(let x=180;x<WORLD_W;x+=390) roads.push({x,y:0,w:76,h:WORLD_H,horiz:false});
 const buildings=[];
 for(let x=20;x<WORLD_W-100;x+=100) for(let y=20;y<WORLD_H-100;y+=100){
  if(roads.some(r=>x<r.x+r.w+22&&x+72>r.x-22&&y<r.y+r.h+22&&y+72>r.y-22))continue;
  const d=districts.find(z=>x>=z.x&&x<z.x+z.w&&y>=z.y&&y<z.y+z.h);
  buildings.push({x:x+rand(-8,8),y:y+rand(-8,8),w:rand(48,80),h:rand(48,80),c:d?.kind==='old'?['#b77e56','#d1b18a','#97745b'][Math.floor(rand(0,3))]:d?.kind==='modern'?['#8299a8','#b8c6ce','#687e91','#d2d0c6'][Math.floor(rand(0,4))]:['#b8a88d','#8a9b8c','#d3c4ad','#a6b2b6'][Math.floor(rand(0,4))],floors:Math.floor(rand(1,7))});
 }
 const cars=Array.from({length:100},(_,i)=>({x:rand(100,WORLD_W-100),y:rand(100,WORLD_H-100),angle:Math.random()<.5?0:Math.PI/2,speed:rand(.25,1.2),color:['#e9bd35','#e5e7eb','#d34537','#2479a9','#242a32','#16805a'][i%6],kind:i%7===0?'bus':i%5===0?'rickshaw':'car'}));
 const peds=Array.from({length:140},()=>({x:rand(0,WORLD_W),y:rand(0,WORLD_H),phase:rand(0,6),color:['#e4b08a','#b97756','#f0caa5'][Math.floor(rand(0,3))]}));
 return {roads,buildings,cars,peds};
}
export default function DhakaDrive(){
 const canvas=useRef(null), game=useRef({x:900,y:900,a:0,speed:0,car:true,run:false,keys:{},city:null,frame:0,mission:0,paused:false});
 const [playing,setPlaying]=useState(true),[carMode,setCarMode]=useState(true),[muted,setMuted]=useState(true),[mission,setMission]=useState('Reach Gulshan Circle 2'); const [stats,setStats]=useState({speed:0,area:'Gulshan Avenue',money:12500,km:0});
 useEffect(()=>{game.current.city=makeCity();const keydown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();game.current.keys[e.key.toLowerCase()]=true;if(e.key==='Escape')setPlaying(v=>!v);};const keyup=e=>{game.current.keys[e.key.toLowerCase()]=false;};window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);};},[]);
 useEffect(()=>{
  let id;const g=game.current,ctx=canvas.current?.getContext('2d');if(!ctx)return;
  const draw=()=>{
   if(!g.city)g.city=makeCity();const c=g.city;
   if(playing&&!g.paused){
    const k=g.keys;
    if(carMode){if(k.w||k.arrowup)g.speed=Math.min(7.5,g.speed+.12);else if(k.s||k.arrowdown)g.speed=Math.max(-2.8,g.speed-.14);else g.speed*=.975;if(k.a||k.arrowleft)g.a-=.035*(Math.abs(g.speed)/3+.25);if(k.d||k.arrowright)g.a+=.035*(Math.abs(g.speed)/3+.25);g.x+=Math.sin(g.a)*g.speed;g.y-=Math.cos(g.a)*g.speed;}
    else {g.speed=0;if(k.w||k.arrowup)g.y-=3;if(k.s||k.arrowdown)g.y+=3;if(k.a||k.arrowleft)g.x-=3;if(k.d||k.arrowright)g.x+=3;}
    g.x=Math.max(30,Math.min(WORLD_W-30,g.x));g.y=Math.max(30,Math.min(WORLD_H-30,g.y));g.frame++;
    c.cars.forEach(v=>{v.x+=Math.cos(v.angle)*v.speed;v.y+=Math.sin(v.angle)*v.speed;if(v.x<0)v.x=WORLD_W;if(v.x>WORLD_W)v.x=0;if(v.y<0)v.y=WORLD_H;if(v.y>WORLD_H)v.y=0;});
   }
   const camX=Math.max(0,Math.min(WORLD_W-W,g.x-W/2)),camY=Math.max(0,Math.min(WORLD_H-H,g.y-H/2));
   ctx.clearRect(0,0,W,H);ctx.fillStyle='#758b70';ctx.fillRect(0,0,W,H);
   // blocks and buildings
   c.buildings.forEach(b=>{const x=b.x-camX,y=b.y-camY;if(x<-120||y<-120||x>W+100||y>H+100)return;ctx.fillStyle='rgba(22,30,28,.25)';ctx.fillRect(x+5,y+7,b.w,b.h);ctx.fillStyle=b.c;ctx.fillRect(x,y,b.w,b.h);ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(x+4,y+4,b.w-8,5);ctx.fillStyle='#5e6a70';for(let yy=y+13;yy<y+b.h-6;yy+=14)for(let xx=x+9;xx<x+b.w-5;xx+=14){ctx.fillStyle=(Math.floor(xx+yy)%3===0)?'#c7d5d2':'#718894';ctx.fillRect(xx,yy,6,7);}if(b.h>65&&b.w>65){ctx.fillStyle='#6e9863';ctx.fillRect(x+8,y+b.h-15,b.w-16,7);}});
   // roads
   c.roads.forEach(r=>{const x=r.x-camX,y=r.y-camY;if(r.horiz){if(y>H||y+r.h<0)return;ctx.fillStyle='#464a4e';ctx.fillRect(x,y,r.w,r.h);ctx.fillStyle='#b5b1a2';ctx.fillRect(x,y,r.w,3);ctx.fillRect(x,y+r.h-3,r.w,3);ctx.strokeStyle='#e7dba5';ctx.setLineDash([24,20]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+r.h/2);ctx.lineTo(x+r.w,y+r.h/2);ctx.stroke();ctx.setLineDash([]);}else{if(x>W||x+r.w<0)return;ctx.fillStyle='#464a4e';ctx.fillRect(x,y,r.w,r.h);ctx.fillStyle='#b5b1a2';ctx.fillRect(x,y,3,r.h);ctx.fillRect(x+r.w-3,y,3,r.h);ctx.strokeStyle='#e7dba5';ctx.setLineDash([24,20]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+r.w/2,y);ctx.lineTo(x+r.w/2,y+r.h);ctx.stroke();ctx.setLineDash([]);}});
   // market stalls and street trees
   for(let x=Math.floor(camX/280)*280;x<camX+W;x+=280)for(let y=Math.floor(camY/300)*300;y<camY+H;y+=300){let sx=x-camX,sy=y-camY;if((Math.floor(x+y)%3)!==0){ctx.fillStyle='#427b48';ctx.beginPath();ctx.arc(sx,sy,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7f6544';ctx.fillRect(sx-2,sy,4,18);}if(Math.floor(x/280+y/300)%4===0){ctx.fillStyle='#d1a76d';ctx.fillRect(sx+24,sy+22,34,20);ctx.fillStyle='#8d4d3d';ctx.fillRect(sx+24,sy+22,34,5);}}
   // landmarks
   landmarks.forEach(l=>{const x=l.x-camX,y=l.y-camY;if(x< -50||y< -50||x>W+50||y>H+50)return;ctx.fillStyle='rgba(10,15,20,.72)';ctx.fillRect(x-70,y-33,140,25);ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(l.icon+' '+l.name,x,y-16);ctx.fillStyle='#e4c58d';ctx.fillRect(x-24,y-4,48,35);ctx.fillStyle='#866e4e';ctx.fillRect(x-17,y+4,34,22);});
   // vehicles
   c.cars.forEach(v=>{const x=v.x-camX,y=v.y-camY;if(x< -70||y< -70||x>W+70||y>H+70)return;ctx.save();ctx.translate(x,y);ctx.rotate(v.angle);if(v.kind==='rickshaw'){ctx.fillStyle='#db5149';ctx.fillRect(-13,-11,26,22);ctx.fillStyle='#e6c74b';ctx.fillRect(-10,-13,20,7);ctx.strokeStyle='#25272b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-15,12,5,0,7);ctx.arc(15,12,5,0,7);ctx.stroke();}else{ctx.fillStyle='#222';ctx.fillRect(-19,-11,38,22);ctx.fillStyle=v.color;ctx.fillRect(-17,-10,34,19);ctx.fillStyle='#b7d4dd';ctx.fillRect(-8,-8,16,16);ctx.fillStyle='#f9e4a0';ctx.fillRect(-17,-9,4,5);ctx.fillRect(13,-9,4,5);if(v.kind==='bus'){ctx.fillStyle='#e2b842';ctx.fillRect(-25,-14,50,28);ctx.fillStyle='#a9c4ca';for(let i=-18;i<22;i+=9)ctx.fillRect(i,-10,6,7);}}ctx.restore();});
   // pedestrians
   c.peds.forEach(p=>{const x=p.x-camX,y=p.y-camY;if(x< -10||y< -10||x>W+10||y>H+10)return;ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y+5,4,2,0,0,7);ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y-5,3,0,7);ctx.fill();ctx.fillStyle=['#d8b34d','#385a7a','#8d5143','#eeeeea'][Math.floor((p.x+p.y)%4)];ctx.fillRect(x-3,y-2,6,8);});
   // player avatar/car
   const px=g.x-camX,py=g.y-camY;ctx.save();ctx.translate(px,py);ctx.rotate(g.a);if(carMode){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-18,-23,40,50);ctx.fillStyle='#c93632';ctx.fillRect(-17,-24,34,48);ctx.fillStyle='#161b23';ctx.fillRect(-12,-17,24,13);ctx.fillStyle='#9fcbd6';ctx.fillRect(-11,-15,22,9);ctx.fillStyle='#242831';ctx.fillRect(-12,1,24,13);ctx.fillStyle='#f9dc95';ctx.fillRect(-14,-22,5,4);ctx.fillRect(9,-22,5,4);ctx.fillStyle='#e8e3da';ctx.fillRect(-14,19,5,4);ctx.fillRect(9,19,5,4);}else{ctx.fillStyle='#e5b48d';ctx.beginPath();ctx.arc(0,-5,7,0,7);ctx.fill();ctx.fillStyle='#243d56';ctx.fillRect(-7,2,14,16);ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-4,17);ctx.lineTo(-7,25);ctx.moveTo(4,17);ctx.lineTo(7,25);ctx.stroke();}ctx.restore();
   // HUD
   const area=districts.find(d=>g.x>=d.x&&g.x<d.x+d.w&&g.y>=d.y&&g.y<d.y+d.h)?.name||'Dhaka Metropolitan Area';
   ctx.fillStyle='rgba(9,13,19,.8)';ctx.fillRect(18,18,270,80);ctx.fillStyle='#f8fafc';ctx.font='bold 18px Arial';ctx.textAlign='left';ctx.fillText('DHAKA: OPEN CITY',32,45);ctx.fillStyle='#9db0c4';ctx.font='13px Arial';ctx.fillText(area,32,66);ctx.fillText('MISSION  •  '+mission,32,86);
   ctx.fillStyle='rgba(8,12,17,.82)';ctx.fillRect(W-205,18,185,165);ctx.strokeStyle='#74818e';ctx.strokeRect(W-205,18,185,165);ctx.fillStyle='#c7d4d2';ctx.font='bold 12px Arial';ctx.fillText('CITY MAP',W-192,38);ctx.fillStyle='#5a705c';ctx.fillRect(W-192,48,160,118);ctx.fillStyle='#5b5e61';for(let i=0;i<6;i++){ctx.fillRect(W-192+i*29,48,5,118);ctx.fillRect(W-192,48+i*22,160,5);}ctx.fillStyle='#df4b42';ctx.beginPath();ctx.arc(W-192+g.x/WORLD_W*160,48+g.y/WORLD_H*118,5,0,7);ctx.fill();landmarks.forEach(l=>{ctx.fillStyle='#f1cb71';ctx.beginPath();ctx.arc(W-192+l.x/WORLD_W*160,48+l.y/WORLD_H*118,2.5,0,7);ctx.fill();});
   ctx.fillStyle='rgba(7,10,15,.78)';ctx.fillRect(18,H-78,430,58);ctx.fillStyle='#f8fafc';ctx.font='bold 13px Arial';ctx.fillText('WASD / ARROWS  •  DRIVE',32,H-53);ctx.fillStyle='#b6c4d2';ctx.font='12px Arial';ctx.fillText('SPACE: BRAKE   •   C: WALK / DRIVE   •   ESC: PAUSE',32,H-32);
   if(!playing){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 38px Arial';ctx.fillText('GAME PAUSED',W/2,H/2);}
   if(playing)id=requestAnimationFrame(draw);
   setStats(old=>({...old,speed:Math.round(Math.abs(g.speed)*12),area,km:Math.max(old.km,Math.round((Math.abs(g.x-900)+Math.abs(g.y-900))/1000))}));
  };draw();return()=>cancelAnimationFrame(id);
 },[playing,carMode,mission]);
 useEffect(()=>{const k=e=>{if(e.key.toLowerCase()==='c')setCarMode(v=>!v);if(e.key===' ')game.current.speed=0;};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[]);
 const newMission=()=>{const next=landmarks[Math.floor(Math.random()*landmarks.length)];setMission('Reach '+next.name);game.current.mission=next.name;};
 return <div className="min-h-screen bg-[#080c12] text-white">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#101722] px-5 py-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-red-600"><CarFront size={25}/></div><div><div className="text-lg font-black tracking-[.18em]">DHAKA <span className="text-red-400">OPEN CITY</span></div><div className="text-xs text-slate-400">VibePulse • Open-world city driving prototype</div></div></div><div className="flex gap-2"><button onClick={()=>setPlaying(v=>!v)} className="rounded-lg bg-red-600 px-4 py-2 font-bold">{playing?<Pause size={16} className="mr-1 inline"/>:<Play size={16} className="mr-1 inline"/>}{playing?'Pause':'Resume'}</button><button onClick={()=>setMuted(v=>!v)} className="rounded-lg border border-white/15 px-3 py-2">{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><button onClick={()=>{game.current.x=900;game.current.y=900;game.current.a=0;game.current.speed=0;setMission('Reach Gulshan Circle 2');}} className="rounded-lg border border-white/15 px-3 py-2"><RotateCcw size={17}/></button></div></header>
  <main className="mx-auto max-w-[1500px] p-4"><div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">{[['SPEED',stats.speed+' km/h'],['CURRENT AREA',stats.area],['WALLET','৳ '+stats.money.toLocaleString()],['DISTANCE',stats.km+' km']].map(([a,b])=><div key={a} className="rounded-xl border border-white/10 bg-[#111a25] p-3"><div className="text-[10px] font-bold tracking-[.18em] text-slate-500">{a}</div><div className="mt-1 truncate text-base font-bold">{b}</div></div>)}</div>
  <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#18201c] shadow-2xl"><canvas ref={canvas} width={W} height={H} className="block h-auto w-full"/></div>
  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_330px]"><section className="rounded-xl border border-white/10 bg-[#111a25] p-4"><h2 className="mb-3 flex items-center gap-2 font-bold"><Map size={18} className="text-red-400"/> Dhaka districts & landmarks</h2><div className="flex flex-wrap gap-2">{landmarks.map(l=><button key={l.name} onClick={()=>{setMission('Reach '+l.name);game.current.x=l.x;game.current.y=l.y;}} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:border-red-400">{l.icon} {l.name}</button>)}</div><p className="mt-3 text-xs text-slate-500">Inspired by Dhaka's dense mixed traffic, rickshaws, markets, old-town streets, parks, and landmark districts. The map is a stylized original game world, not a precise GIS replica.</p></section><aside className="rounded-xl border border-white/10 bg-[#111a25] p-4"><h2 className="mb-3 font-bold">Game Controls</h2><div className="space-y-2 text-sm text-slate-300"><p><b className="text-white">W / ↑</b> Accelerate / move forward</p><p><b className="text-white">S / ↓</b> Reverse / move back</p><p><b className="text-white">A / D</b> Steer</p><p><b className="text-white">C</b> Switch drive / walk</p><p><b className="text-white">Space</b> Brake</p><p><b className="text-white">Esc</b> Pause / resume</p></div><button onClick={newMission} className="mt-4 w-full rounded-lg bg-red-600 py-3 font-bold">Start Random Mission</button><p className="mt-3 text-xs text-slate-500">Prototype: custom canvas game engine; no external game assets or copyrighted GTA assets used.</p></aside></div></main>
 </div>;
}
