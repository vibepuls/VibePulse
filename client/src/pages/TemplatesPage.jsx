import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Check, Clock3, Film, Flame, Music2, Play, Search, Sparkles, TrendingUp, WandSparkles } from 'lucide-react';

const categoryBn = {'For You':'আপনার জন্য','Trending':'ট্রেন্ডিং','Popular':'জনপ্রিয়','New Templates':'নতুন টেমপ্লেট','Photo Templates':'ছবির টেমপ্লেট','Video Templates':'ভিডিও টেমপ্লেট','Beat Sync':'বিট সিঙ্ক','Cinematic':'সিনেমাটিক','Love':'ভালোবাসা','Sad / Emotional':'দুঃখ / আবেগ','Birthday':'জন্মদিন','Travel':'ভ্রমণ','Slow Motion':'স্লো মোশন','Flash Transitions':'ফ্ল্যাশ ট্রানজিশন','Instagram / Reels Style':'ইনস্টাগ্রাম / রিলস স্টাইল','Velocity':'ভেলোসিটি','Glow Up':'গ্লো আপ','Aesthetic':'এস্থেটিক','3D Photo':'3D ছবি','Meme':'মিম','Photo Slideshow':'ছবির স্লাইডশো','Attitude':'অ্যাটিটিউড','Reels & Shorts':'রিলস ও শর্টস','Documentary':'ডকুমেন্টারি','Gaming':'গেমিং','Sports':'খেলাধুলা','Fashion':'ফ্যাশন','Food':'খাবার','Islamic':'ইসলামিক','News':'নিউজ','Business':'ব্যবসা','Festival':'উৎসব','Wedding':'বিয়ে','Fitness':'ফিটনেস','Pets':'পোষা প্রাণী','Nature':'প্রকৃতি'};
const categories = ['For You', 'Trending', 'Popular', 'New Templates', 'Photo Templates', 'Video Templates', 'Beat Sync', 'Cinematic', 'Love', 'Sad / Emotional', 'Birthday', 'Travel', 'Slow Motion', 'Flash Transitions', 'Instagram / Reels Style', 'Velocity', 'Glow Up', 'Aesthetic', '3D Photo', 'Meme', 'Photo Slideshow', 'Attitude', 'Reels & Shorts', 'Documentary', 'Gaming', 'Sports', 'Fashion', 'Food', 'Islamic', 'News', 'Business', 'Festival', 'Wedding', 'Fitness', 'Pets', 'Nature'];

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
  { id:'gaming-highlight', title:'Gaming Highlight', category:'Gaming', duration:'12s', clips:7, trend:93, color:'from-fuchsia-500 via-violet-800 to-black', image:'photo-1542751371-adc38448a05e', description:'Punchy edits for gameplay and streamer moments' },
  { id:'sports-hype', title:'Sports Hype', category:'Sports', duration:'10s', clips:6, trend:92, color:'from-orange-400 via-red-700 to-black', image:'photo-1461896836934-ffe607ba8211', description:'Fast action cuts for match-day highlights' },
  { id:'fashion-editorial', title:'Fashion Editorial', category:'Fashion', duration:'15s', clips:8, trend:88, color:'from-pink-300 via-rose-700 to-black', image:'photo-1483985988355-763728e1935b', description:'Polished looks, smooth motion and editorial color' },
  { id:'food-reel', title:'Food Reel', category:'Food', duration:'12s', clips:7, trend:90, color:'from-yellow-300 via-orange-600 to-red-950', image:'photo-1504674900247-0877df9cc836', description:'Appetizing close-ups and quick food-story pacing' },
  { id:'islamic-reflection', title:'Peaceful Reflection', category:'Islamic', duration:'20s', clips:8, trend:85, color:'from-emerald-300 via-teal-800 to-slate-950', image:'photo-1519817650390-64a93db51149', description:'Calm visuals for reflections, reminders and quotes' },
  { id:'news-explainer', title:'News Explainer', category:'News', duration:'25s', clips:8, trend:91, color:'from-red-400 via-red-900 to-slate-950', image:'photo-1504711434969-e33886168f5c', description:'Bold headline pacing for explainers and updates' },
  { id:'business-story', title:'Business Story', category:'Business', duration:'18s', clips:7, trend:81, color:'from-cyan-300 via-blue-800 to-slate-950', image:'photo-1497366754035-f200968a6e72', description:'Clean, professional edits for brands and founders' },
  { id:'festival-vibes', title:'Festival Vibes', category:'Festival', duration:'15s', clips:9, trend:89, color:'from-yellow-300 via-pink-600 to-purple-950', image:'photo-1492684223066-81342ee5ff30', description:'Colorful celebration montage with energetic rhythm' },
  { id:'wedding-film', title:'Wedding Film', category:'Wedding', duration:'24s', clips:10, trend:86, color:'from-rose-200 via-amber-600 to-stone-950', image:'photo-1519741497674-611481863552', description:'Romantic wedding highlights with gentle cinematic movement' },
  { id:'fitness-motivation', title:'Fitness Motivation', category:'Fitness', duration:'12s', clips:6, trend:87, color:'from-lime-300 via-emerald-700 to-black', image:'photo-1534438327276-14e5300c3a48', description:'Energetic workout recap with bold contrast' },
  { id:'pet-moments', title:'Pet Moments', category:'Pets', duration:'14s', clips:7, trend:83, color:'from-amber-200 via-orange-600 to-stone-950', image:'photo-1450778869180-41d0601e046e', description:'Cute, warm moments for your favorite companions' },
  { id:'nature-escape', title:'Nature Escape', category:'Nature', duration:'20s', clips:9, trend:84, color:'from-green-300 via-emerald-800 to-slate-950', image:'photo-1441974231531-c6227db76b6e', description:'Slow scenic motion and natural cinematic tones' },
  { id:'velocity-rush', title:'Velocity Rush', category:'Velocity', duration:'10s', clips:7, trend:99, color:'from-red-400 via-fuchsia-700 to-black', image:'photo-1519608487953-e999c86e7455', description:'Fast slow-fast motion with punchy zooms' },
  { id:'beat-drop', title:'Beat Drop Montage', category:'Beat Sync', duration:'12s', clips:8, trend:98, color:'from-violet-400 via-indigo-800 to-black', image:'photo-1492684223066-81342ee5ff30', description:'Rhythmic photo cuts and energetic flashes' },
  { id:'glow-up', title:'Glow Up Transformation', category:'Glow Up', duration:'15s', clips:6, trend:96, color:'from-amber-200 via-pink-600 to-purple-950', image:'photo-1524504388940-b1c1722653e1', description:'Before-and-after reveal with a bright transition' },
  { id:'aesthetic-dream', title:'Aesthetic Dream', category:'Aesthetic', duration:'15s', clips:8, trend:92, color:'from-pink-200 via-purple-500 to-indigo-950', image:'photo-1490730141103-6cac27aaab94', description:'Soft tones, gentle motion and dreamy light' },
  { id:'3d-photo-depth', title:'3D Photo Depth', category:'3D Photo', duration:'10s', clips:5, trend:94, color:'from-cyan-300 via-blue-700 to-black', image:'photo-1470252649378-9c29740c9fa8', description:'Depth-inspired parallax movement for portraits' },
  { id:'meme-reaction', title:'Meme Reaction', category:'Meme', duration:'9s', clips:5, trend:91, color:'from-yellow-300 via-orange-600 to-black', image:'photo-1534528741775-53994a69daeb', description:'Punch-in framing for funny reactions and captions' },
  { id:'makeup-transition', title:'Beauty Switch', category:'Fashion', duration:'12s', clips:6, trend:90, color:'from-rose-300 via-fuchsia-700 to-black', image:'photo-1483985988355-763728e1935b', description:'Beauty transition with polished color and smooth zoom' },
  { id:'couple-story', title:'Couple Story', category:'Love', duration:'18s', clips:9, trend:89, color:'from-rose-300 via-red-700 to-purple-950', image:'photo-1516589178581-6cd7833ae3b2', description:'Romantic timeline with soft transitions' },
  { id:'flash-fit-check', title:'Fit Check Flash', category:'Fashion', duration:'8s', clips:5, trend:95, color:'from-orange-300 via-rose-600 to-black', image:'photo-1483985988355-763728e1935b', description:'Quick outfit reveals with flash cuts' },
  { id:'concert-hype', title:'Concert Hype', category:'Festival', duration:'13s', clips:8, trend:93, color:'from-fuchsia-400 via-violet-800 to-black', image:'photo-1501386761578-eac5c94b800a', description:'Stage-light energy for concerts and live events' },
  { id:'mini-vlog', title:'Mini Vlog Diary', category:'Reels & Shorts', duration:'20s', clips:10, trend:90, color:'from-teal-300 via-blue-700 to-black', image:'photo-1500534623283-312aaderf0e0', description:'A daily-vlog rhythm with clean transitions' },
  { id:'pet-comedy', title:'Pet Comedy', category:'Pets', duration:'11s', clips:6, trend:88, color:'from-amber-200 via-orange-600 to-black', image:'photo-1450778869180-41d0601e046e', description:'Cute reactions with playful punch-in motion' }
];

const imageUrl = (id) => !id ? '' : (/^https?:\\/\\//i.test(id) ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`);

const templateMotion = {
  'cinematic-gold':'vp-template-kenburns','love-moments':'vp-template-romance','travel-diary':'vp-template-parallax',
  'birthday-recap':'vp-template-bounce','dark-attitude':'vp-template-shake','memories-sad':'vp-template-slow-pan',
  'photo-beat':'vp-template-beat','reel-flash':'vp-template-flash','docu-story':'vp-template-documentary',
  'city-lights':'vp-template-neon','summer-trip':'vp-template-drift','soft-love':'vp-template-romance',
  'minimal-story':'vp-template-zoomout','party-night':'vp-template-party','birthday-film':'vp-template-bounce',
  'slow-moments':'vp-template-slow-pan','gaming-highlight':'vp-template-glitch','sports-hype':'vp-template-shake',
  'fashion-editorial':'vp-template-editorial','food-reel':'vp-template-push','islamic-reflection':'vp-template-slow-pan',
  'news-explainer':'vp-template-news','business-story':'vp-template-zoomout','festival-vibes':'vp-template-party',
  'wedding-film':'vp-template-romance','fitness-motivation':'vp-template-shake','pet-moments':'vp-template-bounce',
  'nature-escape':'vp-template-parallax',
  'velocity-rush':'vp-template-shake','beat-drop':'vp-template-beat','glow-up':'vp-template-flash',
  'aesthetic-dream':'vp-template-romance','3d-photo-depth':'vp-template-parallax','meme-reaction':'vp-template-bounce',
  'makeup-transition':'vp-template-editorial','couple-story':'vp-template-romance','flash-fit-check':'vp-template-flash',
  'concert-hype':'vp-template-party','mini-vlog':'vp-template-drift','pet-comedy':'vp-template-bounce',
};
const templateOverlay = {
  'photo-beat':'vp-template-overlay-beat','reel-flash':'vp-template-overlay-flash',
  'gaming-highlight':'vp-template-overlay-glitch','city-lights':'vp-template-overlay-neon',
  'party-night':'vp-template-overlay-party','festival-vibes':'vp-template-overlay-party',
  'sports-hype':'vp-template-overlay-flash','dark-attitude':'vp-template-overlay-glitch',
  'news-explainer':'vp-template-overlay-news','fashion-editorial':'vp-template-overlay-editorial',
  'food-reel':'vp-template-overlay-warm','wedding-film':'vp-template-overlay-soft',
  'love-moments':'vp-template-overlay-soft','soft-love':'vp-template-overlay-soft',
  'birthday-recap':'vp-template-overlay-party','birthday-film':'vp-template-overlay-party'
};
const motionFor = (template) => templateMotion[template?.id] || 'vp-template-kenburns';
const overlayFor = (template) => templateOverlay[template?.id] || 'vp-template-overlay-cinema';


export default function TemplatesPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => localStorage.getItem('vibepulse-language') || 'en');
  const bn = language === 'bn';
  const tr = (en, bangla) => bn ? bangla : en;
  const toggleLanguage = () => { const next = bn ? 'en' : 'bn'; setLanguage(next); localStorage.setItem('vibepulse-language', next); window.dispatchEvent(new Event('vibepulse-language-change')); };
  const [category, setCategory] = useState('For You');
  const [remoteTemplates, setRemoteTemplates] = useState([]);
  const [templateLoadError, setTemplateLoadError] = useState('');
  useEffect(() => { let active = true; api.get('/templates').then(({data}) => { if (!active) return; setRemoteTemplates((Array.isArray(data) ? data : []).map(item => ({ id:item.id, title:item.title, category:item.category, duration:`${item.durationSeconds || 15}s`, clips:item.requiredSlots || 6, mediaMode:item.mediaMode || 'MIXED', trend:item.trending ? 99 : item.popular ? 94 : 70, color:'from-violet-400 via-fuchsia-700 to-slate-950', image:item.thumbnailUrl || '', previewUrl:item.previewUrl || '', description:item.description || '', aspectRatio:item.aspectRatio || '9:16', config:item.config || {}, musicUrl:item.musicUrl || '', musicLicense:item.musicLicense || '', source:'database' }))); }).catch(() => { if(active) setTemplateLoadError(''); }); return () => { active = false; }; }, []);
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
    const files = Array.from(event.target.files || []).filter(file => (['image/jpeg','image/png','image/webp'].includes(file.type) || ['video/mp4','video/quicktime','video/webm'].includes(file.type)) && file.size <= (file.type.startsWith('video/') ? 100 : 15) * 1024 * 1024);
    if (!chosenTemplate) { event.target.value = ''; return; }
    if (!files.length) { event.target.value = ''; return; }
    if (files.length < chosenTemplate.clips) {
      const proceed = window.confirm(`This template is designed for ${chosenTemplate.clips} photos/videos. You selected ${files.length}. Continue with these files?`);
      if (!proceed) { event.target.value = ''; return; }
    }
    navigate('/template-studio?template=' + encodeURIComponent(chosenTemplate.id), { state: { templateId: chosenTemplate.id, templateTitle: chosenTemplate.title, templateCategory: chosenTemplate.category, templateFiles: files, templateConfig: chosenTemplate.config || {}, templateRequiredSlots: chosenTemplate.clips, templateMediaMode: chosenTemplate.mediaMode || 'MIXED', templateDuration: parseFloat(chosenTemplate.duration) || 15, templateAspectRatio: chosenTemplate.aspectRatio || '9:16', templateMusicUrl: chosenTemplate.musicUrl || '' }, replace: false });
    event.target.value = '';
  };

  const allTemplates = useMemo(() => { const ids = new Set(remoteTemplates.map(t => t.id)); return [...remoteTemplates, ...templates.filter(t => !ids.has(t.id))]; }, [remoteTemplates]);
  const filtered = useMemo(() => allTemplates
    .filter(t => category === 'For You' || (category === 'Trending' ? t.trend >= 90 : category === 'Popular' ? (t.trend >= 90 || t.popular) : category === 'New Templates' ? t.source === 'database' : category === 'Photo Templates' ? t.mediaMode !== 'VIDEO' : category === 'Video Templates' ? t.mediaMode !== 'PHOTO' : category === 'Slow Motion' ? /slow/i.test(t.title + ' ' + t.description) : category === 'Flash Transitions' ? /flash/i.test(t.title + ' ' + t.description) : category === 'Sad / Emotional' ? ['Sad','Sad / Emotional'].includes(t.category) : category === 'Instagram / Reels Style' ? ['Reels & Shorts','Instagram / Reels Style'].includes(t.category) : t.category === category))
    .filter(t => !query || (t.title + ' ' + t.category + ' ' + t.description).toLowerCase().includes(query.toLowerCase()))
    .filter(t => !savedOnly || saved.includes(t.id))
    .sort((a,b) => category === 'Trending' || category === 'Popular' || category === 'For You' ? b.trend-a.trend : 0), [allTemplates, category, query, savedOnly, saved]);

  const toggleSaved = (id) => setSaved(old => {
    const next = old.includes(id) ? old.filter(x => x !== id) : [...old, id];
    localStorage.setItem('vibepulse-saved-templates', JSON.stringify(next));
    return next;
  });

  const useTemplate = (template) => navigate('/template-studio?template=' + encodeURIComponent(template.id), { state: { templateId: template.id, templateTitle: template.title, templateCategory: template.category, templateConfig: template.config || {}, templateRequiredSlots: template.clips, templateMediaMode: template.mediaMode || 'MIXED', templateDuration: parseFloat(template.duration) || 15, templateAspectRatio: template.aspectRatio || '9:16', templateMusicUrl: template.musicUrl || '' } });

  return <main className="min-h-screen bg-[#080b14] text-white">\n    <input id="vibepulse-template-media-picker" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple hidden onChange={onMediaPicked} />
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080b14]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"><ArrowLeft size={18}/> {tr('Back to VibePulse','VibePulse-এ ফিরুন')}</button>
        <div className="flex items-center gap-2 font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500"><Film size={20}/></span><span>VibePulse <span className="text-violet-300">Templates</span></span></div>
        <div className="flex items-center gap-2"><button onClick={toggleLanguage} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold">{bn?'English':'বাংলা'}</button><button onClick={() => navigate('/template-studio')} className="hidden rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-100 sm:inline-flex sm:items-center sm:gap-2"><WandSparkles size={17}/> {tr('Open Studio','স্টুডিও খুলুন')}</button></div>
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
        <div><h2 className="text-2xl font-black">{tr('Explore templates','টেমপ্লেট দেখুন')}</h2><p className="mt-1 text-sm text-slate-400">{tr('Choose a style to preview or start editing.','প্রিভিউ দেখুন অথবা ভিডিও তৈরি করতে একটি স্টাইল বেছে নিন।')}</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 sm:w-72 sm:flex-none"><Search size={17} className="shrink-0 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr('Search templates...','টেমপ্লেট খুঁজুন...')} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"/></label>
          <button onClick={() => setSavedOnly(v=>!v)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${savedOnly?'border-violet-300 bg-violet-300/15 text-violet-200':'border-white/10 text-slate-300 hover:bg-white/10'}`}><Bookmark size={16}/>{savedOnly?tr('Saved','সংরক্ষিত'):tr('Favorites','পছন্দের')}{saved.length>0&&<span>{saved.length}</span>}</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">9:16 TikTok / Reels</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">Photo + video inputs</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">Animated previews</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">Save favorites</span>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category===c?'border-violet-300 bg-violet-400/15 text-violet-200':'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'}`}>{bn ? (categoryBn[c] || c) : c}</button>)}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-400"><span>{filtered.length} {tr('templates','টি টেমপ্লেট')}</span><span className="inline-flex items-center gap-1"><TrendingUp size={15}/> Sorted for discovery</span></div>
      {filtered.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((t,i)=><article key={t.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] transition hover:-translate-y-1 hover:border-violet-300/40 hover:bg-white/[0.07]">
          <div role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setPreview(t)}}} onClick={()=>setPreview(t)} className="relative block aspect-[9/16] w-full cursor-pointer overflow-hidden bg-slate-900 text-left">
            {t.previewUrl ? <video src={t.previewUrl} muted playsInline loop autoPlay preload="metadata" poster={imageUrl(t.image)} className={`vp-template-motion h-full w-full object-cover ${motionFor(t)}`} /> : <img src={imageUrl(t.image)} alt={t.title} loading="lazy" className={`vp-template-motion h-full w-full object-cover ${motionFor(t)}`} />}
            <div className={`absolute inset-0 bg-gradient-to-t ${t.color} opacity-50 mix-blend-multiply`}/><div className={`pointer-events-none absolute inset-0 ${overlayFor(t)}`}/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10"/>
            {t.trend>=90&&<span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-1 text-[10px] font-black uppercase"><Flame size={11}/> Trending</span>}
            <button onClick={e=>{e.stopPropagation();toggleSaved(t.id)}} aria-label={saved.includes(t.id)?'Remove favorite':'Save favorite'} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/80">{saved.includes(t.id)?<Check size={16} className="text-violet-200"/>:<Bookmark size={15}/>}</button>
            <span className="absolute bottom-3 left-3 right-3"><span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-violet-200"><Play size={11} fill="currentColor"/> Preview</span><span className="block text-base font-black leading-tight sm:text-lg">{t.title}</span></span>
          </div>
          <div className="p-3"><div className="flex items-center justify-between gap-2 text-xs text-slate-400"><span className="truncate">{t.category}</span><span className="inline-flex shrink-0 items-center gap-1"><Clock3 size={12}/>{t.duration}</span></div><div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500"><span>{t.clips} media slots</span><span>·</span><span>{t.mediaMode || 'MIXED'}</span><span>·</span><span>{t.aspectRatio || '9:16'}</span>{t.musicUrl&&<span className="inline-flex items-center gap-1"><Music2 size={10}/> Music</span>}</div><p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-slate-400">{t.description}</p><button onClick={()=>chooseTemplate(t)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-black transition hover:bg-violet-400"><WandSparkles size={14}/> {tr('Use Template','টেমপ্লেট ব্যবহার')}</button></div>
        </article>)}
      </div> : <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-400">No templates match this search. Try another keyword or category.</div>}
      <p className="mt-8 text-center text-xs leading-5 text-slate-500">Choose a template, select your own photos or videos, and VibePulse will automatically apply its look, motion and vertical 9:16 format.</p>
    </section>

    {preview&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={()=>setPreview(null)}>
      <div role="dialog" aria-modal="true" aria-label={preview.title} className="grid w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#101321] md:grid-cols-2" onClick={e=>e.stopPropagation()}>
        <div className="relative min-h-72 md:min-h-[430px]">{preview.previewUrl ? <video src={preview.previewUrl} controls playsInline className="absolute inset-0 h-full w-full object-cover" poster={imageUrl(preview.image)} /> : <img src={imageUrl(preview.image)} alt={preview.title} className={`vp-template-motion absolute inset-0 h-full w-full object-cover ${motionFor(preview)}`} />}<div className={`absolute inset-0 bg-gradient-to-t ${preview.color} opacity-50 mix-blend-multiply`}/><div className={`pointer-events-none absolute inset-0 ${overlayFor(preview)}`}/><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/><span className="absolute bottom-5 left-5 text-2xl font-black">{preview.title}</span></div>
        <div className="flex flex-col p-6 sm:p-8"><div className="text-xs font-black uppercase tracking-widest text-violet-300">{preview.category}</div><h3 className="mt-3 text-2xl font-black">{preview.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{preview.description}. Tap Use this template, choose your photos/videos, and VibePulse Studio will arrange them with this template’s color, motion, effects and vertical 9:16 layout.</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-500">Duration</div><div className="mt-1 font-bold">{preview.duration}</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-500">Required photo/video slots</div><div className="mt-1 font-bold">{preview.clips}</div></div></div><div className="mt-auto flex flex-col gap-2 pt-8"><button onClick={()=>{setPreview(null);chooseTemplate(preview)}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-bold hover:bg-violet-400"><WandSparkles size={17}/> {tr('Use this template','এই টেমপ্লেট ব্যবহার করুন')}</button><button onClick={()=>toggleSaved(preview.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-semibold hover:bg-white/5"><Bookmark size={16}/>{saved.includes(preview.id)?'Remove from favorites':'Save to favorites'}</button><button onClick={()=>setPreview(null)} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white">{tr('Close preview','প্রিভিউ বন্ধ করুন')}</button></div></div>
      </div>
    </div>}
  </main>;
}
