import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import {
  Award, BadgeDollarSign, Crown, Gift, Gem, Lock, RefreshCw, Shield,
  Swords, Target, Trophy, Zap, Flame, ShoppingBag, Timer, Sparkles
} from 'lucide-react';

const seedPosts = [
  { id: 1, user: 'Rafi', avatar: 'R', caption: 'আজকের sunset drop 🌅', points: 1280, color: 'from-orange-500 to-pink-500', shield: false },
  { id: 2, user: 'Nadia', avatar: 'N', caption: 'New photo — কে King হবে? 👑', points: 1110, color: 'from-violet-500 to-fuchsia-500', shield: true },
  { id: 3, user: 'Sakib', avatar: 'S', caption: 'Night ride energy ⚡', points: 970, color: 'from-cyan-500 to-blue-600', shield: false },
  { id: 4, user: 'Mim', avatar: 'M', caption: 'Coffee + rain = perfect day ☕', points: 840, color: 'from-emerald-500 to-teal-600', shield: false },
];

const initialState = {
  points: 0,
  posts: [],
  inventory: { shields: 2, boosters: 1 },
  lastSpin: 0,
  lastSteal: {},
  claimed: {},
  wins: 17,
  kingMinutes: 186,
};

function loadState() {
  return initialState;
}

export default function PointWars() {
  const [state, setState] = useState(loadState);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/point-wars').then(({data}) => setState(s => ({...s, points:data.balance, posts:data.posts.map((p,i)=>({id:p.id,user:p.username,avatar:(p.username||'U')[0].toUpperCase(),caption:p.content||'VibePulse post',points:Number(p.points||0),color:['from-orange-500 to-pink-500','from-violet-500 to-fuchsia-500','from-cyan-500 to-blue-600','from-emerald-500 to-teal-600'][i%4],shield:!!p.shield_expires_at}), inventory:{shields:Number(data.inventory.find(x=>x.item_type==='shield')?.quantity||0),boosters:Number(data.inventory.find(x=>x.item_type==='booster')?.quantity||0)}, quests:data.quests, shop:data.shop, hall:data.hall.map(x=>[x.username,Math.floor(Number(x.king_seconds||0)/60)])}))).catch(e=>flash(e.response?.data?.error||'Failed to load Point Wars')).finally(()=>setLoading(false)); }, []);
  const [tab, setTab] = useState('battle');
  const [message, setMessage] = useState('');
  const [giftTarget, setGiftTarget] = useState(null);
  const [giftAmount, setGiftAmount] = useState('100');
  const [duel, setDuel] = useState(null);
  const [duelTime, setDuelTime] = useState(180);
  const [spinResult, setSpinResult] = useState(null);



  const ranked = useMemo(() => [...state.posts].sort((a, b) => b.points - a.points), [state.posts]);
  const king = ranked[0];
  const canSpin = Date.now() - state.lastSpin >= 86400000;

  useEffect(() => {
    if (!duel) return;
    const timer = setInterval(() => setDuelTime(t => {
      if (t <= 1) { clearInterval(timer); finishDuel(); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [duel]);

  const flash = (text) => { setMessage(text); setTimeout(() => setMessage(''), 2200); };

  async function steal(post) { try { const {data}=await api.post(`/point-wars/posts/${post.id}/steal`); setState(st=>({...st,points:st.points+data.amount,posts:st.posts.map(p=>p.id===post.id?{...p,points:p.points-data.amount}:p)})); flash(`🔥 +${data.amount} points stolen from @${post.user}`); } catch(e){flash(`❌ ${e.response?.data?.error||'Steal failed'}`)} }
  async function gift(post) { try { const amount = giftAmount === 'ALL' ? 'ALL' : Number(giftAmount); const {data}=await api.post('/point-wars/gift',{postId:post.id,amount}); setState(st=>({...st,points:st.points-data.amount,posts:st.posts.map(p=>p.id===post.id?{...p,points:p.points+data.amount}:p)})); setGiftTarget(null); flash(`🎁 ${data.amount.toLocaleString()} points gifted to @${post.user}`); } catch(e){flash(`❌ ${e.response?.data?.error||'Gift failed'}`)} }
  function activateShield(postId) {
    if (!state.inventory.shields) return flash('🛡️ Shield নেই।');
    setState(s => ({ ...s, inventory: { ...s.inventory, shields: s.inventory.shields - 1 }, posts: s.posts.map(p => p.id === postId ? { ...p, shield: true } : p) }));
    flash('🛡️ Shield activated for this post.');
  }

  function boost(postId) {
    if (!state.inventory.boosters) return flash('⚡ 2X Booster নেই।');
    setState(s => ({ ...s, inventory: { ...s.inventory, boosters: s.inventory.boosters - 1 }, posts: s.posts.map(p => p.id === postId ? { ...p, points: p.points + 100 } : p) }));
    flash('⚡ 2X Booster activated! +100 demo points.');
  }

  async function spin() { try { const {data}=await api.post('/point-wars/spin'); setSpinResult(data.amount); setState(st=>({...st,points:st.points+data.amount,lastSpin:Date.now()})); } catch(e){flash(`❌ ${e.response?.data?.error||'Spin failed'}`)} }
  async function claimQuest(id, reward) { try { const {data}=await api.post(`/point-wars/quests/${id}/claim`); setState(st=>({...st,points:st.points+data.reward,claimed:{...st.claimed,[id]:true}})); flash(`✅ Quest claimed: +${data.reward}`); } catch(e){flash(`❌ ${e.response?.data?.error||'Quest not ready'}`)} }
  function startDuel(post) {
    if (state.points < 100) return flash('⚠️ Duel join করতে কমপক্ষে 100 points লাগবে।');
    setState(s => ({ ...s, points: s.points - 100 }));
    setDuel({ post, myScore: 100, enemyScore: Math.floor(80 + Math.random() * 80) });
    setDuelTime(180);
  }

  function duelAttack() {
    if (!duel) return;
    const gain = 10 + Math.floor(Math.random() * 31);
    setDuel(d => ({ ...d, myScore: d.myScore + gain, enemyScore: d.enemyScore + Math.floor(Math.random() * 20) }));
  }

  function finishDuel() {
    setDuel(d => {
      if (!d) return null;
      const won = d.myScore >= d.enemyScore;
      setState(s => ({ ...s, points: s.points + (won ? 200 : 0), wins: s.wins + (won ? 1 : 0) }));
      setTimeout(() => flash(won ? '🏆 Duel won! +200 points' : '💥 Duel lost. Better luck next time!'), 0);
      return null;
    });
  }

  const formatTime = sec => `${String(Math.floor(sec / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`;

  if (loading) return <div className="p-10 text-center font-bold">Loading Point Wars…</div>;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="rounded-3xl overflow-hidden mb-5 border border-yellow-400/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-300/20 text-yellow-300 text-xs font-bold tracking-wider uppercase"><Sparkles size={14}/> Point Wars</div>
              <h1 className="text-3xl md:text-5xl font-black mt-3">Battle for the <span className="text-yellow-300">King Throne</span></h1>
              <p className="text-slate-300 mt-2 max-w-2xl">Post points বাড়াও, অন্যদের challenge করো, Shield/Booster ব্যবহার করো এবং hourly King Bounty জিতে নাও।</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 px-5 py-4 min-w-[190px]">
              <div className="text-xs text-slate-300">Your Balance</div>
              <div className="text-3xl font-black text-yellow-300">{state.points.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">POINTS</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10">
          {[[Crown,'Current King',`@${king.user}`],[Trophy,'King Minutes',state.kingMinutes],[Swords,'Duel Wins',state.wins],[Gift,'Inventory',`${state.inventory.shields} 🛡️ · ${state.inventory.boosters} ⚡`]].map(([Icon,label,value]) => <div key={label} className="p-4 flex items-center gap-3"><Icon className="text-yellow-300" size={20}/><div><div className="text-xs text-slate-400">{label}</div><div className="font-bold text-sm truncate">{value}</div></div></div>)}
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[['battle','⚔️ Battle'],['quests','🎯 Quests'],['spin','🎡 Spin'],['shop','🛍️ Shop'],['hall','🏆 Hall of Fame']].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition ${tab===id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}>{label}</button>)}
      </div>

      {tab === 'battle' && <>
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <section className="space-y-4">
            {ranked.map((post, index) => <div key={post.id} className={`rounded-2xl p-4 border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm ${index===0 ? 'ring-2 ring-yellow-400/70 border-yellow-300' : 'border-gray-200'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${post.color} flex items-center justify-center text-xl font-black text-white shrink-0`}>{post.avatar}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-black">@{post.user}</span>{index===0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-700">👑 KING</span>}{post.shield && <Shield size={15} className="text-cyan-500"/>}</div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{post.caption}</p>
                  <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full" style={{width:`${Math.min(100, post.points / Math.max(1, ranked[0].points) * 100)}%`}} /></div>
                </div>
                <div className="text-right"><div className="text-2xl font-black">{post.points.toLocaleString()}</div><div className="text-[10px] text-gray-500">POINTS</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => steal(post)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300 text-sm font-bold">🔥 Steal 10</button>
                <button onClick={() => setGiftTarget(post)} className="px-3 py-2 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-300 text-sm font-bold"><Gift size={15} className="inline mr-1"/> Gift</button>
                <button onClick={() => startDuel(post)} className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300 text-sm font-bold"><Swords size={15} className="inline mr-1"/> Duel</button>
                <button onClick={() => activateShield(post.id)} className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-300 text-sm font-bold"><Shield size={15} className="inline mr-1"/> Shield</button>
                <button onClick={() => boost(post.id)} className="px-3 py-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300 text-sm font-bold"><Zap size={15} className="inline mr-1"/> 2X</button>
              </div>
            </div>)}
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between"><h2 className="font-black flex items-center gap-2"><Crown className="text-yellow-500"/> King Throne</h2><span className="text-xs text-gray-500">Hourly</span></div>
              <div className="text-center py-5"><div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-3xl shadow-xl">👑</div><div className="font-black text-xl mt-3">@{king.user}</div><div className="text-sm text-gray-500">{king.points.toLocaleString()} points</div></div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3 text-center"><div className="text-xs text-gray-500">Next King Bounty</div><div className="text-2xl font-black text-yellow-500 mt-1">+500</div><div className="text-xs text-gray-500">awarded to #1</div></div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5"><div className="flex items-center gap-2 font-black"><Target size={19}/> Quick Challenge</div><p className="text-indigo-100 text-sm mt-2">Top player-কে duel করে 200 points জিততে পারো। Entry 100 points.</p><button onClick={() => startDuel(king)} className="mt-4 w-full py-2.5 rounded-xl bg-white text-indigo-700 font-black hover:bg-indigo-50">Start 1v1 Duel</button></div>
          </aside>
        </div>
      </>}

      {tab === 'quests' && <div className="grid md:grid-cols-2 gap-4">{[
        ['daily-login','Daily Login','আজ VibePulse-এ active থাকো',100,'☀️'],['engage-5','Hot 5','৫টি post-এ react করো',250,'🔥'],['gift-1','Generous','একটি gift পাঠাও',500,'🎁'],['duel-1','Warrior','একটি duel খেলো',300,'⚔️']
      ].map(([id,title,desc,reward,emoji]) => <div key={id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4"><div className="text-3xl">{emoji}</div><div className="flex-1"><h3 className="font-black">{title}</h3><p className="text-sm text-gray-500 mt-1">{desc}</p><div className="text-sm font-black text-yellow-600 mt-2">+{reward} points</div></div><button disabled={state.claimed[id]} onClick={() => claimQuest(id,reward)} className={`px-4 py-2 rounded-xl font-bold ${state.claimed[id] ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{state.claimed[id] ? 'Claimed' : 'Claim'}</button></div>)}</div>}

      {tab === 'spin' && <div className="max-w-xl mx-auto rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center"><div className="mx-auto w-36 h-36 rounded-full border-8 border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-6xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl">🎡</div><h2 className="text-3xl font-black mt-6">Daily Spin</h2><p className="text-gray-500 mt-2">প্রতি ২৪ ঘণ্টায় একবার spin করে 50–500 points জিতো।</p>{spinResult ? <div className="mt-6 text-5xl font-black text-yellow-500">+{spinResult}</div> : null}<button onClick={spin} disabled={!canSpin} className="mt-6 px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black disabled:opacity-40">{canSpin ? 'SPIN NOW' : 'COME BACK LATER'}</button></div>}

      {tab === 'shop' && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[['frame','✨ Glow Frame',1500,'Profile avatar-এ premium glow'],['vip','💎 VIP Badge',5000,'নামে VIP badge'],['gold','🟡 Gold Username',2500,'Username gold style'],['shield','🛡️ Shield ×1',700,'১ ঘণ্টা theft protection'],['booster','⚡ 2X Booster',1200,'Interaction boost'],['loot','🎁 Mystery Box',1000,'Random point reward']].map(([id,name,cost,desc]) => <div key={id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5"><div className="text-3xl">{name.split(' ')[0]}</div><h3 className="font-black text-lg mt-3">{name.slice(name.indexOf(' ')+1)}</h3><p className="text-sm text-gray-500 mt-1 min-h-10">{desc}</p><div className="flex items-center justify-between mt-5"><span className="font-black text-yellow-600">{cost.toLocaleString()} pts</span><button onClick={() => { if(state.points < cost) return flash('❌ Not enough points'); setState(s => ({...s,points:s.points-cost,inventory:{...s.inventory,...(id==='shield'?{shields:s.inventory.shields+1}:id==='booster'?{boosters:s.inventory.boosters+1}:{})}})); flash(`🛍️ ${name} purchased`); }} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Buy</button></div></div>)}</div>}

      {tab === 'hall' && <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden"><div className="p-5 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-black flex items-center gap-2"><Trophy className="text-yellow-500"/> Hall of Fame</h2><p className="text-sm text-gray-500 mt-1">সবচেয়ে বেশি সময় King Throne ধরে রাখা players.</p></div>{[['Rafi',1860],['Nadia',1412],['Sakib',987],['Mim',721],['You',state.kingMinutes]].sort((a,b)=>b[1]-a[1]).map(([name,min],i)=><div key={name} className="p-4 flex items-center gap-4 border-b last:border-0 border-gray-100 dark:border-gray-700"><div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black">#{i+1}</div><div className="flex-1 font-bold">@{name}</div><div className="font-black text-yellow-600">{min.toLocaleString()} min</div></div>)}</div>}

      {giftTarget && <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl"><h3 className="text-xl font-black">🎁 Gift to @{giftTarget.user}</h3><p className="text-sm text-gray-500 mt-1">Balance: {state.points.toLocaleString()}</p><input value={giftAmount} onChange={e=>setGiftAmount(e.target.value)} className="w-full mt-4 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent" placeholder="Amount or ALL"/><div className="flex gap-2 mt-4"><button onClick={()=>setGiftTarget(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold">Cancel</button><button onClick={()=>gift(giftTarget)} className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white font-bold">Send Gift</button></div></div></div>}

      {duel && <div className="fixed inset-0 z-[95] bg-slate-950/90 flex items-center justify-center p-4"><div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl"><div className="flex justify-between items-center"><div><div className="text-xs text-indigo-500 font-black uppercase">Live 1v1 Duel</div><h3 className="text-2xl font-black mt-1">You vs @{duel.post.user}</h3></div><div className="text-3xl font-black text-red-500">{formatTime(duelTime)}</div></div><div className="grid grid-cols-2 gap-4 mt-6"><div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 p-6 text-center"><div className="text-sm text-gray-500">YOU</div><div className="text-5xl font-black text-indigo-600 mt-2">{duel.myScore}</div></div><div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-6 text-center"><div className="text-sm text-gray-500">@{duel.post.user}</div><div className="text-5xl font-black text-red-600 mt-2">{duel.enemyScore}</div></div></div><button onClick={duelAttack} className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-lg"><Swords className="inline mr-2"/> ATTACK + POINTS</button><p className="text-center text-xs text-gray-500 mt-3">Winner receives 200 points bonus in this working prototype.</p></div></div>}

      {message && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 rounded-2xl bg-slate-950 text-white font-bold shadow-2xl">{message}</div>}
    </div>
  );
}

// Point Wars deployment sync
