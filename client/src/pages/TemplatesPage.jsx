import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Check, Clock3, Film, Flame, Play, Search, Sparkles, TrendingUp, WandSparkles } from 'lucide-react';

const categories = ['For You', 'Trending', 'Cinematic', 'Love', 'Photo Slideshow', 'Travel', 'Birthday', 'Sad', 'Attitude', 'Reels & Shorts', 'Documentary'];

const templates = [
  { id:'cinematic-gold', title:'Golden Hour Cinema', category:'Cinematic', duration:'15s', clips:8, trend:98, color:'from-amber-300 via-orange-600 to-slate-950', image:'photo-1470252649378-9c29740c9fa8', description:'Warm cinematic color and slow zooms' },
  { id:'love-moments', title:'Our Little Moments', category:'Love', duration:'12s', clips:6, trend:96, color:'from-rose-400 via-pink-700 to-purple-950', image:'photo-1516589178581-6cd7833ae3b2', description:'Soft romantic photo montage' },
  { id:'travel-diary', title:'Travel Diary', category:'Travel', duration:'20s', clips:10, trend:94, color:'from-cyan-300 via-blue-700 to-slate-950', image:'photo-1464822759023-fed622ff2c3b', description:'Adventure cuts with smooth motion' },
  { id:'birthday-recap', title:'Birthday Memories', category:'Birthday', duration:'18s', clips:9, trend:91, color:'from-fuchsia-400 via-purple-700 to-indigo-950', image:'photo-1530103862676-de8c9debad1d', description:'Colorful celebration slideshow' },
  { id:'dark-attitude', title:'Dark Attitude', category:'Attitude', duration:'10s', clips:5, trend:89, color:'from-slate-500 via-zinc-900 to-black', image:'photo-1519608487953-e999c86e7455', description:'Bold dark look with punchy cuts' },
  { id:'memories-sad', title:'Memories in Rain', category:'Sad', duration:'16s', clips:7, trend:87, color:'from-blue-300 via-indigo-900 to-slate-950', image:'photo-1519608487953-e999c86e7455', description:'Moody blue tones and gentle movement' },
  { id:'photo-beat', title:'Photo Beat Sync', category:'Photo Slideshow', duration:'12s', clips:8, trend:97, color:'from-violet-400 via-fuchsia-700 to-slate-950', image:'photo-1492684223066-81342ee5ff30', description:'Fast slideshow rhythm for your photos' },
  { id:'reel-flash', title:'Flashback Reel', category:'Reels & Shorts', duration:'9s', clips:6, trend:95, color:'from-yellow-300 via-red-600 to-purple-950', image:'photo-1531058020387-3be344556be6', description:'Quick flashes and energetic framing' },
  { id:'docu-story', title:'Documentary Story', category:'Documentary', duration:'32s', clips:12, trend:92, color:'from-stone-300 via-stone-700 to-neutral-950', image:'photo-1500530855697-b586d89ba3ee', description:'Subtle Ken Burns movement for narration' },
  { id:'city-lights', title:'City After Dark', category:'Cinematic', duration:'14s', clips:7, trend:86, color:'from-indigo-400 via-blue-900 to-black', image:'photo-1519608487953-e999c86e7455', description:'Night-city atmosphere and slow pans' },
  { id:'summer-trip', title:'Summer Trip', category:'Travel', duration:'15s', clips:8, trend:88, color:'from-lime-300 via-emerald-700 to-teal-950', image:'photo-1500534623283-312aaderf0e0', description:'Bright travel recap with natural colors' },
  { id:'soft-love', title:'Soft Focus Love', category:'Love', duration:'11s', clips:5, trend:84, color:'from-pink-200 via-rose-500 to-red-950', image:'photo-1522673607200-164d1b6ce486', description:'Dreamy transitions and gentle zoom' },
  { id:'minimal-story', title:'Minimal Story', category:'Documentary', duration:'24s', clips:8, trend:82, color:'from-stone-300 via-neutral-700 to-black', image:'photo-1455390582262-044cdead277a', description:'Clean titles and slow image movement' },
  { id:'party-night', title:'Party Night', category:'Reels & Shorts', duration:'13s', clips:9, trend:90, color:'from-purple-400 via-pink-600 to-orange-500', image:'photo-1492684223066-81342ee5ff30', description:'Vibrant party recap for vertical video' },
  { id:'birthday-film', title:'Birthday Film', category:'Birthday', duration:'20s', clips:10, trend:80, color:'from-orange-300 via-pink-600 to-violet-950', image:'photo-1464349153735-7db50ed83c84', description:'A highlight reel for a special day' },
  { id:'slow-moments', title:'Slow Moments', category:'Sad', duration:'18s', clips:6, trend:78, color:'from-slate-300 via-blue-800 to-black', image:'photo-1470770841072-f978cf4d019e', description:'Quiet pacing and atmospheric movement' },
];

const imageUrl = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('For You');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vibepulse-saved-templates') || '[]'); } catch { return []; }
  });
  const [savedOnly, setSavedOnly] = useState(false);
  const [preview, setPreview] = useState(null);
  const [chosenTemplate, setChosenTemplate] = useState(null);
  const mediaPickerRef = useState(null);
  const fileInputRef = { current: null };
  const chooseTemplate = (template) => { setChosenTemplate(template); document.getElementById('vibepulse-template-media-picker')?.click(); };
  const onMediaPicked = (event) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (!files.length || !chosenTemplate) return;
    navigate('/cinematic?template=' + encodeURIComponent(chosenTemplate.id), { state: { templateId: chosenTemplate.id, templateTitle: chosenTemplate.title, templateCategory: chosenTemplate.category, templateFiles: files }, replace: false });
    event.target.value = '';
  };

  const filtered = useMemo(() => templates
    .filter(t => category === 'For You' || (category === 'Trending' ? t.trend >= 90 : t.category === category))
    .filter(t => !query || (t.title + ' ' + t.category + ' ' + t.description).toLowerCase().includes(query.toLowerCase()))
    .filter(t => !savedOnly || saved.includes(t.id))
    .sort((a,b) => category === 'Trending' || category === 'For You' ? b.trend-a.trend : 0), [category, query, savedOnly, saved]);

  const toggleSaved = (id) => setSaved(old => {
    const next = old.includes(id) ? old.filter(x => x !== id) : [...old, id];
    localStorage.setItem('vibepulse-saved-templates', JSON.stringify(next));
    return next;
  });

  const useTemplate = (template) => navigate('/cinematic?template=' + encodeURIComponent(template.id));

  return <main className="min-h-screen bg-[#080b14] text-white">\n    <input id="vibepulse-template-media-picker" type="file" accept="image/*,video/*" multiple hidden onChange={onMediaPicked} />
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080b14]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"><ArrowLeft size={18}/> Back to VibePulse</button>
        <div className="flex items-center gap-2 font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500"><Film size={20}/></span><span>VibePulse <span className="text-violet-300">Templates</span></span></div>
        <button onClick={() => navigate('/cinematic')} className="hidden rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-100 sm:inline-flex sm:items-center sm:gap-2"><WandSparkles size={17}/> Open Studio</button>
      </div>
    </header>

    <section className="mx-auto max-w-7xl px-4 pb-7 pt-8 sm:px-6 sm:pt-12">
      <div className="relative overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950 via-[#17112e] to-[#0c1728] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"/>
        <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-200"><Sparkles size={14}/> Creator Template Library</span>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Make your next video <span className="text-violet-300">stand out.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Explore cinematic looks, photo stories, travel edits and short-form styles. Choose a starting point, then finish your video in VibePulse Studio.</p>
            <div className="mt-6 flex flex-wrap gap-3"><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"><Flame size={17} className="text-orange-300"/> Trending styles</div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"><WandSparkles size={17} className="text-violet-300"/> Made for creators</div></div>
          </div>
          <div className="hidden h-52 w-44 rotate-3 overflow-hidden rounded-2xl border border-white/20 shadow-2xl md:block"><img src={imageUrl('photo-1470252649378-9c29740c9fa8')} alt="Cinematic landscape template preview" className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/><div className="absolute bottom-3 left-3 right-3"><div className="text-xs font-bold uppercase tracking-widest text-violet-200">Featured</div><div className="font-black">Golden Hour Cinema</div></div></div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-black">Explore templates</h2><p className="mt-1 text-sm text-slate-400">Choose a style to preview or start editing.</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 sm:w-72 sm:flex-none"><Search size={17} className="shrink-0 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"/></label>
          <button onClick={() => setSavedOnly(v=>!v)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${savedOnly?'border-violet-300 bg-violet-300/15 text-violet-200':'border-white/10 text-slate-300 hover:bg-white/10'}`}><Bookmark size={16}/>{savedOnly?'Saved':'Favorites'}{saved.length>0&&<span>{saved.length}</span>}</button>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category===c?'border-violet-300 bg-violet-400/15 text-violet-200':'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'}`}>{c}</button>)}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-400"><span>{filtered.length} templates</span><span className="inline-flex items-center gap-1"><TrendingUp size={15}/> Sorted for discovery</span></div>
      {filtered.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((t,i)=><article key={t.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] transition hover:-translate-y-1 hover:border-violet-300/40 hover:bg-white/[0.07]">
          <div role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setPreview(t)}}} onClick={()=>setPreview(t)} className="relative block aspect-[9/16] w-full cursor-pointer overflow-hidden bg-slate-900 text-left">
            <img src={imageUrl(t.image)} alt={t.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
            <div className={`absolute inset-0 bg-gradient-to-t ${t.color} opacity-50 mix-blend-multiply`}/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10"/>
            {t.trend>=90&&<span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-1 text-[10px] font-black uppercase"><Flame size={11}/> Trending</span>}
            <button onClick={e=>{e.stopPropagation();toggleSaved(t.id)}} aria-label={saved.includes(t.id)?'Remove favorite':'Save favorite'} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/80">{saved.includes(t.id)?<Check size={16} className="text-violet-200"/>:<Bookmark size={15}/>}</button>
            <span className="absolute bottom-3 left-3 right-3"><span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-violet-200"><Play size={11} fill="currentColor"/> Preview</span><span className="block text-base font-black leading-tight sm:text-lg">{t.title}</span></span>
          </div>
          <div className="p-3"><div className="flex items-center justify-between gap-2 text-xs text-slate-400"><span className="truncate">{t.category}</span><span className="inline-flex shrink-0 items-center gap-1"><Clock3 size={12}/>{t.duration}</span></div><p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-slate-400">{t.description}</p><button onClick={()=>chooseTemplate(t)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-black transition hover:bg-violet-400"><WandSparkles size={14}/> Use Template</button></div>
        </article>)}
      </div> : <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-400">No templates match this search. Try another keyword or category.</div>}
      <p className="mt-8 text-center text-xs leading-5 text-slate-500">Choose a template, select your own photos or videos, and VibePulse will automatically apply its look, motion and vertical 9:16 format.</p>
    </section>

    {preview&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={()=>setPreview(null)}>
      <div role="dialog" aria-modal="true" aria-label={preview.title} className="grid w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#101321] md:grid-cols-2" onClick={e=>e.stopPropagation()}>
        <div className="relative min-h-72 md:min-h-[430px]"><img src={imageUrl(preview.image)} alt={preview.title} className="absolute inset-0 h-full w-full object-cover"/><div className={`absolute inset-0 bg-gradient-to-t ${preview.color} opacity-50 mix-blend-multiply`}/><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/><span className="absolute bottom-5 left-5 text-2xl font-black">{preview.title}</span></div>
        <div className="flex flex-col p-6 sm:p-8"><div className="text-xs font-black uppercase tracking-widest text-violet-300">{preview.category}</div><h3 className="mt-3 text-2xl font-black">{preview.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{preview.description}. A starter style to help you build a video in VibePulse Studio.</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-500">Duration</div><div className="mt-1 font-bold">{preview.duration}</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-500">Photo slots</div><div className="mt-1 font-bold">{preview.clips}</div></div></div><div className="mt-auto flex flex-col gap-2 pt-8"><button onClick={()=>{setPreview(null);chooseTemplate(preview)}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-bold hover:bg-violet-400"><WandSparkles size={17}/> Use this template</button><button onClick={()=>toggleSaved(preview.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-semibold hover:bg-white/5"><Bookmark size={16}/>{saved.includes(preview.id)?'Remove from favorites':'Save to favorites'}</button><button onClick={()=>setPreview(null)} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white">Close preview</button></div></div>
      </div>
    </div>}
  </main>;
}
