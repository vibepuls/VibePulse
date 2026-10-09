import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, ArrowDownRight, Bell, Camera, Check, ChevronRight, Crown, Gift,
  Gamepad2, Heart, ImagePlus, LoaderCircle, LogOut, MessageCircle, Plus,
  RefreshCw, Search, Send, Shield, Swords, Trophy, Users, Wallet, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const fmt = (n) => new Intl.NumberFormat().format(Number(n || 0));
const dateText = (value) => value ? new Date(value).toLocaleString() : '';
const errText = (e, fallback = 'Something went wrong. Please try again.') => e?.response?.data?.error || e?.message || fallback;
const menu = [
  ['home', 'Home', Activity], ['ranking', 'Ranking', Trophy], ['wallet', 'Wallet', Wallet],
  ['missions', 'Missions', Zap], ['battles', 'Photo Battles', Swords], ['games', 'Mini Games', Gamepad2],
  ['teams', 'Teams', Users], ['referrals', 'Referral', Gift], ['messages', 'Messages', MessageCircle],
  ['notifications', 'Notifications', Bell], ['profile', 'My Profile', Shield]
];

function Avatar({ user, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  return user?.avatarUrl
    ? <img src={user.avatarUrl} alt="" className={`${sizeClass} rounded-full object-cover`} />
    : <div className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-black text-white`}>{(user?.displayName || user?.username || 'U').slice(0,1).toUpperCase()}</div>;
}

function Panel({ title, subtitle, children, action }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-xl sm:p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}</div>
      {action}
    </div>
    {children}
  </section>;
}

function Notice({ notice, onClose }) {
  if (!notice) return null;
  return <div role="status" className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/30 bg-rose-400/10 text-rose-100'}`}>
    <span>{notice.text}</span><button onClick={onClose} aria-label="Close message" className="font-bold opacity-70">×</button>
  </div>;
}

function SocialGamingApp() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [section, setSection] = useState('home');
  const [me, setMe] = useState(user);
  const [posts, setPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('overall');
  const [transactions, setTransactions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [battles, setBattles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [referral, setReferral] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileUsername, setProfileUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageTarget, setMessageTarget] = useState('');
  const [messageText, setMessageText] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [imageFile, setImageFile] = useState(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [giftUsername, setGiftUsername] = useState('');
  const [giftAmount, setGiftAmount] = useState('100');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [opponentUsername, setOpponentUsername] = useState('');
  const [myBattlePostId, setMyBattlePostId] = useState('');
  const [opponentBattlePostId, setOpponentBattlePostId] = useState('');
  const [myPosts, setMyPosts] = useState([]);
  const [opponentPosts, setOpponentPosts] = useState([]);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminAmount, setAdminAmount] = useState('100');
  const [adminNote, setAdminNote] = useState('Admin adjustment');
  const [globalText, setGlobalText] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportCategory, setReportCategory] = useState('SPAM');
  const [reportDetails, setReportDetails] = useState('');
  const [gameSession, setGameSession] = useState(null);
  const [gameRemaining, setGameRemaining] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const gameScoreRef = useRef(0);

  const tell = (text, kind = 'success') => setNotice({ text, kind });
  const refreshMe = useCallback(async () => {
    const response = await api.get('/me');
    setMe(response.data);
    setUser(response.data);
  }, [setUser]);

  const loadCore = useCallback(async () => {
    setLoading(true);
    const jobs = await Promise.allSettled([
      api.get('/me'), api.get('/posts?page=1'), api.get('/leaderboard'), api.get('/missions'),
      api.get('/achievements/me'), api.get('/battles'), api.get('/teams'), api.get('/notifications'),
      api.get('/points/transactions?limit=50'), api.get('/referrals/me')
    ]);
    const take = (i, setter, fallback) => {
      if (jobs[i].status === 'fulfilled') setter(jobs[i].value.data);
      else if (fallback !== undefined) setter(fallback);
    };
    take(0, (value) => { setMe(value); setUser(value); setDisplayName(value.displayName || ''); setBio(value.bio || ''); }, null);
    take(1, setPosts, []); take(2, setLeaderboard, []); take(3, setMissions, []);
    take(4, setAchievements, []); take(5, setBattles, []); take(6, setTeams, []);
    take(7, setNotifications, []); take(8, setTransactions, []); take(9, setReferral, null);
    setLoading(false);
  }, [setUser]);

  useEffect(() => { loadCore(); }, [loadCore]);

  useEffect(() => {
    const username = params.username;
    if (location.pathname.startsWith('/profile/') && username) {
      setSection('profile');
      setProfileUsername(username);
      loadProfile(username);
    }
  }, [location.pathname, params.username]);

  const loadProfile = async (username) => {
    if (!username) return;
    try {
      const [p, ps] = await Promise.all([
        api.get(`/users/${encodeURIComponent(username)}/profile`),
        api.get(`/users/${encodeURIComponent(username)}/posts`)
      ]);
      setProfile(p.data); setProfilePosts(ps.data); setProfileUsername(username);
    } catch (e) { tell(errText(e, 'Could not load profile.'), 'error'); }
  };

  const loadLeaderboard = async (nextPeriod = period) => {
    try {
      const url = nextPeriod === 'overall' ? '/leaderboard' : `/leaderboard/${nextPeriod}`;
      const { data } = await api.get(url);
      setLeaderboard(data); setPeriod(nextPeriod);
    } catch (e) { tell(errText(e), 'error'); }
  };

  const findUsers = async (event) => {
    event?.preventDefault();
    if (query.trim().length < 2) { setUsers([]); return; }
    try { const { data } = await api.get(`/users?q=${encodeURIComponent(query.trim())}`); setUsers(data); }
    catch (e) { tell(errText(e), 'error'); }
  };

  const collectPoints = async (username) => {
    if (!username || username === me?.username) return;
    setBusy(`steal:${username}`);
    try {
      const { data } = await api.post(`/points/steal/${encodeURIComponent(username)}`);
      tell(`🥷 +${fmt(data.stolen)} points collected from @${username}.`);
      await Promise.all([refreshMe(), loadCore()]);
    } catch (e) { tell(errText(e, 'Point collection failed.'), 'error'); }
    finally { setBusy(''); }
  };

  const giftPoints = async (event) => {
    event.preventDefault();
    const amount = Number(giftAmount);
    if (!giftUsername.trim() || !Number.isInteger(amount) || amount < 1) return tell('Enter a username and a positive whole-number amount.', 'error');
    setBusy('gift');
    try {
      await api.post('/points/gift', { username: giftUsername.trim(), amount });
      tell(`🎁 ${fmt(amount)} points sent to @${giftUsername.trim()}.`);
      setGiftUsername('');
      await loadCore();
    } catch (e) { tell(errText(e, 'Gift failed.'), 'error'); }
    finally { setBusy(''); }
  };

  const createPost = async (event) => {
    event.preventDefault();
    setBusy('post');
    try {
      let finalUrl = imageUrl.trim();
      if (imageFile) {
        const data = new FormData(); data.append('file', imageFile);
        const uploaded = await api.post('/media/upload', data);
        finalUrl = uploaded.data.url;
      }
      if (!finalUrl) return tell('Choose a photo or paste a direct image URL.', 'error');
      await api.post('/posts', { imageUrl: finalUrl, caption: caption.trim(), privacy });
      setCaption(''); setImageUrl(''); setImageFile(null);
      const fileInput = document.getElementById('arena-photo-file'); if (fileInput) fileInput.value = '';
      tell('Photo published! Daily post rewards are limited to five posts.');
      await loadCore();
    } catch (e) { tell(errText(e, 'Could not publish photo. Image uploads require server-side Supabase Storage configuration.'), 'error'); }
    finally { setBusy(''); }
  };

  const toggleFollow = async (username) => {
    setBusy(`follow:${username}`);
    try {
      const { data } = await api.post(`/follows/${encodeURIComponent(username)}`);
      tell(data.following ? `You are now following @${username}.` : `You unfollowed @${username}.`);
      if (profileUsername === username) await loadProfile(username);
      await loadCore();
    } catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const loadMessages = async (event) => {
    event?.preventDefault();
    const target = messageTarget.trim();
    if (!target) return tell('Enter a username to open a conversation.', 'error');
    try { const { data } = await api.get(`/messages/${encodeURIComponent(target)}`); setMessages(data); setMessageTarget(target); setSection('messages'); }
    catch (e) { tell(errText(e, 'Could not load messages.'), 'error'); }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageTarget.trim() || !messageText.trim()) return;
    setBusy('message');
    try {
      await api.post('/messages', { toUsername: messageTarget.trim(), body: messageText.trim() });
      setMessageText('');
      const { data } = await api.get(`/messages/${encodeURIComponent(messageTarget.trim())}`);
      setMessages(data); tell('Message sent.');
    } catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const markNotification = async (notification) => {
    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications((old) => old.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (e) { tell(errText(e), 'error'); }
  };

  const claimMission = async (id) => {
    setBusy(`mission:${id}`);
    try { const { data } = await api.post(`/missions/${id}/claim`); tell(data.shieldUntil ? 'Mission complete: 30-minute shield activated.' : `Mission reward: +${fmt(data.reward)} points.`); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const openMystery = async () => {
    setBusy('mystery');
    try { const { data } = await api.post('/rewards/mystery'); tell(data.rewardType === 'SHIELD' ? 'Mystery reward: 30-minute point shield!' : `Mystery reward: +${fmt(data.amount)} points!`); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const startGame = async () => {
    setBusy('game');
    try {
      const { data } = await api.post('/games/quick-tap/start');
      gameScoreRef.current = 0; setGameScore(0); setGameSession(data); setGameRemaining(10); tell('Game started. Complete the full 10 seconds to claim your verified score.');
    } catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  useEffect(() => {
    if (!gameSession) return undefined;
    const interval = window.setInterval(() => {
      setGameRemaining((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(interval);
          (async () => {
            try {
              const { data } = await api.post(`/games/quick-tap/${gameSession.id}/finish`, { score: gameScoreRef.current });
              tell(`Practice complete: +${fmt(data.score)} points.`);
              setGameSession(null); await loadCore();
            } catch (e) { tell(errText(e, 'Game reward could not be claimed.'), 'error'); setGameSession(null); }
          })();
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [gameSession, loadCore]);

  const tapGame = () => {
    if (!gameSession || gameRemaining <= 0) return;
    gameScoreRef.current = Math.min(120, gameScoreRef.current + 1);
    setGameScore(gameScoreRef.current);
  };

  const createTeam = async (event) => {
    event.preventDefault();
    if (teamName.trim().length < 3) return tell('Team name needs at least 3 characters.', 'error');
    setBusy('team');
    try { await api.post('/teams', { name: teamName.trim(), description: teamDescription.trim() }); setTeamName(''); setTeamDescription(''); tell('Team created.'); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const joinTeam = async (id) => {
    setBusy(`team:${id}`);
    try { await api.post(`/teams/${id}/join`); tell('Joined team.'); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const loadOpponentPosts = async (event) => {
    event?.preventDefault();
    if (!opponentUsername.trim()) return tell('Enter an opponent username.', 'error');
    try {
      const [mine, theirs] = await Promise.all([
        api.get(`/users/${encodeURIComponent(me.username)}/posts`),
        api.get(`/users/${encodeURIComponent(opponentUsername.trim())}/posts`)
      ]);
      setMyPosts(mine.data); setOpponentPosts(theirs.data); setMyBattlePostId(mine.data[0]?.id || ''); setOpponentBattlePostId(theirs.data[0]?.id || '');
    } catch (e) { tell(errText(e, 'Could not load battle photos.'), 'error'); }
  };

  const createBattle = async (event) => {
    event.preventDefault();
    setBusy('battle');
    try {
      await api.post('/battles', { opponentUsername: opponentUsername.trim(), challengerPostId: myBattlePostId, opponentPostId: opponentBattlePostId });
      tell('Photo battle created. The opponent has been notified.'); await loadCore();
    } catch (e) { tell(errText(e, 'Could not create battle.'), 'error'); }
    finally { setBusy(''); }
  };

  const voteBattle = async (battleId, choice) => {
    setBusy(`vote:${battleId}`);
    try { await api.post(`/battles/${battleId}/vote`, { choice }); tell('Your vote has been recorded.'); await loadCore(); }
    catch (e) { tell(errText(e, 'Vote failed.'), 'error'); }
    finally { setBusy(''); }
  };

  const claimReferralShare = async () => {
    setBusy('referral');
    try {
      const link = referral?.referralUrl || `${window.location.origin}/register?ref=${encodeURIComponent(me.username)}`;
      try { await navigator.clipboard.writeText(link); } catch {}
      const { data } = await api.post('/referrals/share-reward');
      tell(`Referral link copied. Daily reward: +${fmt(data.reward)} points.`);
      await loadCore();
    } catch (e) { tell(errText(e, 'Could not claim referral reward.'), 'error'); }
    finally { setBusy(''); }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportTarget) return;
    setBusy('report');
    try { await api.post('/reports', { targetType: reportTarget.type, targetId: reportTarget.id, category: reportCategory, details: reportDetails }); setReportTarget(null); setReportDetails(''); tell('Report sent to moderation.'); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const loadAdmin = async () => {
    if (me?.role !== 'ADMIN') return;
    const results = await Promise.allSettled([api.get('/admin/users'), api.get('/admin/reports'), api.get('/admin/audit-logs'), api.get('/admin/transactions'), api.get('/admin/posts')]);
    if (results[0].status === 'fulfilled') setAdminUsers(results[0].value.data || []);
    if (results[1].status === 'fulfilled') setReports(results[1].value.data || []);
    if (results[2].status === 'fulfilled') setAuditLogs(results[2].value.data || []);
    if (results[3].status === 'fulfilled') setAdminTransactions(results[3].value.data || []);
  };

  useEffect(() => { if (section === 'admin') loadAdmin(); }, [section, me?.role]);

  const adjustPoints = async (event) => {
    event.preventDefault();
    setBusy('admin-points');
    try { await api.post('/admin/points', { username: adminUsername.trim(), amount: Number(adminAmount), note: adminNote }); tell('Admin point adjustment recorded.'); await loadAdmin(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const changeStatus = async (username, status) => {
    try { await api.patch(`/admin/users/${encodeURIComponent(username)}/status`, { status }); tell(`@${username} status changed to ${status}.`); await loadAdmin(); }
    catch (e) { tell(errText(e), 'error'); }
  };

  const moderatePost = async (id, hidden) => {
    try { await api.patch(`/admin/posts/${id}/moderation`, { hidden }); tell(hidden ? 'Post hidden.' : 'Post restored.'); await loadAdmin(); }
    catch (e) { tell(errText(e), 'error'); }
  };

  const updateReport = async (id, status) => {
    try { await api.patch(`/admin/reports/${id}/status`, { status }); tell(`Report marked ${status.toLowerCase()}.`); await loadAdmin(); }
    catch (e) { tell(errText(e), 'error'); }
  };

  const sendGlobalNotice = async (event) => {
    event.preventDefault();
    if (!globalText.trim()) return;
    try { const { data } = await api.post('/admin/notifications/global', { text: globalText.trim() }); setGlobalText(''); tell(`Notification sent to ${data.sent} users.`); await loadAdmin(); }
    catch (e) { tell(errText(e), 'error'); }
  };

  const myRank = leaderboard.findIndex((item) => item.username === me?.username) + 1;
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const navTo = (key) => {
    setSection(key);
    if (key === 'ranking') loadLeaderboard('overall');
    if (key === 'profile') { setProfileUsername(me?.username || ''); loadProfile(me?.username); }
    if (key === 'admin') loadAdmin();
  };

  const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryButton = 'rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50';
  const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/70';

  return <div className="min-h-screen bg-[#080b16] text-slate-100">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080b16]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button onClick={() => navTo('home')} className="flex items-center gap-2 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400"><Zap size={21} className="text-white"/></span>
          <span><span className="block text-lg font-black tracking-tight text-white">VibePulse</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Social Gaming Arena</span></span>
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2"><Zap size={16} className="text-amber-200"/><span className="text-sm font-black text-amber-100">{fmt(me?.points)}</span><span className="hidden text-xs text-amber-200/70 sm:inline">POINTS</span></div>
        <div className="flex items-center gap-2">
          <button className={secondaryButton} onClick={() => { setProfileUsername(me?.username || ''); loadProfile(me?.username); setSection('profile'); }}><Avatar user={me}/><span className="ml-2 hidden sm:inline">@{me?.username}</span></button>
          <button className={secondaryButton} title="Log out" onClick={() => { logout(); navigate('/login'); }}><LogOut size={17}/></button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-3 pb-3 sm:px-6">
        {menu.filter(([key]) => key !== 'profile' || Boolean(me)).filter(([key]) => key !== 'profile' || true).map(([key, label, Icon]) => <button key={key} onClick={() => navTo(key)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${section === key ? 'bg-violet-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon size={16}/><span>{label}</span>{key === 'notifications' && unreadCount > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">{unreadCount}</span>}</button>)}
        {me?.role === 'ADMIN' && <button onClick={() => navTo('admin')} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${section === 'admin' ? 'bg-violet-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Shield size={16}/>Admin</button>}
      </nav>
    </header>

    <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
      <Notice notice={notice} onClose={() => setNotice(null)}/>
      {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={16} className="animate-spin"/> Syncing your account…</div>}

      {section === 'home' && <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-600/20 via-slate-900 to-cyan-500/10 p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Post → Earn → Steal → Gift → Battle → Rank</div><h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">Your next rank starts here.</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Publish a photo, earn verified points, compete fairly, and climb the community leaderboard.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs text-slate-400">Your rank</div><div className="mt-1 text-3xl font-black text-white">{myRank ? `#${myRank}` : '—'}</div></div></div>
          </section>
          <Panel title="Publish a photo" subtitle="Photo post reward: +10 points, limited to five rewarded posts per UTC day.">
            <form onSubmit={createPost} className="space-y-3">
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000} placeholder="Write a caption or add #hashtags…" className={`${inputClass} min-h-20 resize-y`}/>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-400">Photo file (up to 5 MB)
                  <input id="arena-photo-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-slate-100"/>
                </label>
                <label className="text-xs font-semibold text-slate-400">Or direct image URL
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/photo.jpg" className={inputClass}/>
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={inputClass + ' max-w-48'}>
                  <option value="PUBLIC">Public</option><option value="FOLLOWERS">Followers</option><option value="PRIVATE">Private</option>
                </select>
                <button disabled={busy === 'post'} className={primaryButton}>{busy === 'post' ? 'Publishing…' : <><ImagePlus size={16} className="mr-2 inline"/>Publish photo</>}</button>
              </div>
            </form>
          </Panel>
          <Panel title="Community feed" subtitle="Live posts from the database." action={<button onClick={loadCore} className={secondaryButton}><RefreshCw size={15} className="mr-2 inline"/>Refresh</button>}>
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                {post.imageUrl && <img src={post.imageUrl} alt={post.caption || 'Community photo'} loading="lazy" className="aspect-[4/3] w-full object-cover"/>}
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-3"><Avatar user={post.author}/><button onClick={() => { setProfileUsername(post.author?.username); loadProfile(post.author?.username); setSection('profile'); }} className="min-w-0 text-left"><div className="truncate text-sm font-bold text-white">{post.author?.displayName || post.author?.username}</div><div className="text-xs text-slate-500">@{post.author?.username}</div></button><span className="ml-auto text-sm font-black text-amber-200">⚡ {fmt(post.points)}</span></div>
                  {post.caption && <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{post.caption}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{post._count?.likes || 0} likes</span><span>•</span><span>{post._count?.comments || 0} comments</span><span className="ml-auto">{dateText(post.createdAt)}</span></div>
                  <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    {post.author?.username !== me?.username && <button disabled={Boolean(busy)} onClick={() => collectPoints(post.author?.username)} className={secondaryButton}>{busy === `steal:${post.author?.username}` ? '…' : <><ArrowDownRight size={15} className="mr-1 inline"/>Steal 3</>}</button>}
                    <button onClick={() => setReportTarget({ type: 'POST', id: post.id })} className={secondaryButton}>Report</button>
                    {post.author?.username && <button onClick={() => { setMessageTarget(post.author.username); setSection('messages'); }} className={secondaryButton}><MessageCircle size={15} className="mr-1 inline"/>Message</button>}
                  </div>
                </div>
              </article>)}
              {posts.length === 0 && <p className="py-8 text-center text-sm text-slate-500 md:col-span-2">No posts yet. Publish the first photo to start the arena.</p>}
            </div>
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Top players" subtitle="Overall point ranking" action={<button onClick={() => navTo('ranking')} className="text-sm font-semibold text-violet-300">View all <ChevronRight size={14} className="inline"/></button>}>
            <div className="space-y-3">{leaderboard.slice(0, 5).map((player) => <div key={player.id} className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${player.rank === 1 ? 'bg-amber-300 text-slate-950' : 'bg-white/5 text-slate-400'}`}>{player.rank}</span><Avatar user={player}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">@{player.username}</div><div className="text-xs text-slate-500">{player.displayName}</div></div><span className="text-sm font-bold text-amber-200">{fmt(player.points)}</span></div>)}</div>
          </Panel>
          <Panel title="Send point gift" subtitle="Gift points from your available balance.">
            <form onSubmit={giftPoints} className="space-y-3"><label className="block text-xs text-slate-400">Recipient username<input value={giftUsername} onChange={(e) => setGiftUsername(e.target.value)} placeholder="e.g. rahim" className={inputClass}/></label><label className="block text-xs text-slate-400">Amount<input type="number" min="1" max="1000000" step="1" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} className={inputClass}/></label><button disabled={busy === 'gift'} className={primaryButton}><Gift size={15} className="mr-2 inline"/>Send gift</button></form>
          </Panel>
          <Panel title="Fair-play rules" subtitle="Points are validated on the server.">
            <ul className="space-y-2 text-sm text-slate-400"><li>• Steal transfers exactly 3 points.</li><li>• Same-target cooldown: 4 seconds.</li><li>• Daily steal cap: 200.</li><li>• No paid wagers or cash-out.</li></ul>
          </Panel>
        </aside>
      </div>}

      {section === 'ranking' && <div className="space-y-5">
        <div className="flex flex-wrap gap-2">{[['overall','Overall'],['daily','Today'],['weekly','This week']].map(([key,label]) => <button key={key} onClick={() => loadLeaderboard(key)} className={section === 'ranking' && period === key ? primaryButton : secondaryButton}>{label}</button>)}</div>
        <Panel title="Leaderboard" subtitle="Current points or net point movement for the selected period.">
          <div className="space-y-2">{leaderboard.map((player) => <div key={player.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-950/50 p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-sm font-black">{player.rank}</div><Avatar user={player}/><div className="min-w-0 flex-1"><button onClick={() => { setProfileUsername(player.username); loadProfile(player.username); setSection('profile'); }} className="font-bold text-white">@{player.username}</button><div className="text-xs text-slate-500">{player.displayName}</div></div><div className="text-right"><div className="font-black text-amber-200">{fmt(player.points)} pts</div>{player.periodPoints !== undefined && <div className="text-xs text-slate-500">Period: {fmt(player.periodPoints)}</div>}</div>{player.username !== me?.username && <button disabled={Boolean(busy)} onClick={() => collectPoints(player.username)} className={secondaryButton}>{busy === `steal:${player.username}` ? '…' : 'Steal 3'}</button>}</div>)}</div>
        </Panel>
      </div>}

      {section === 'wallet' && <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <Panel title="Point wallet" subtitle="Available balance and recent activity"><div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-amber-300/10 p-5"><div className="text-sm text-slate-400">Available points</div><div className="mt-2 text-4xl font-black text-amber-100">{fmt(me?.points)}</div><div className="mt-3 text-xs text-slate-500">No cash-out is enabled.</div></div></Panel>
        <Panel title="Transaction history" subtitle="Latest 50 point movements"><div className="space-y-2">{transactions.map((tx) => <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${tx.direction === 'in' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>{tx.direction === 'in' ? '+' : '−'}</span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{tx.type.replaceAll('_',' ')}</div><div className="truncate text-xs text-slate-500">{tx.note || (tx.direction === 'in' ? 'Points received' : 'Points sent')}</div><div className="text-[11px] text-slate-600">{dateText(tx.createdAt)}</div></div><strong className={tx.direction === 'in' ? 'text-emerald-200' : 'text-rose-200'}>{tx.direction === 'in' ? '+' : '−'}{fmt(tx.amount)}</strong></div>)}{transactions.length === 0 && <p className="py-6 text-sm text-slate-500">No transactions yet.</p>}</div></Panel>
      </div>}

      {section === 'missions' && <div className="space-y-5">
        <Panel title="Daily missions" subtitle="Complete real actions to unlock point or shield rewards."><div className="grid gap-3 md:grid-cols-2">{missions.map((mission) => <div key={mission.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{mission.title}</h3><p className="mt-1 text-sm text-slate-400">{mission.description}</p></div><span className="text-sm font-black text-amber-200">{mission.rewardType === 'SHIELD' ? '🛡️ Shield' : `+${fmt(mission.reward)} pts`}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, mission.progress / mission.target * 100)}%` }}/></div><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{mission.progress}/{mission.target}</span><button disabled={!mission.completed || mission.claimed || Boolean(busy)} onClick={() => claimMission(mission.id)} className={mission.claimed ? 'text-emerald-300' : 'font-bold text-violet-300 disabled:text-slate-600'}>{mission.claimed ? 'Claimed ✓' : 'Claim reward'}</button></div></div>)}</div></Panel>
        <Panel title="Achievements" subtitle="Milestones are checked against your real activity."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{achievements.map((achievement) => <div key={achievement.id} className={`rounded-xl border p-4 ${achievement.unlocked ? 'border-amber-300/30 bg-amber-300/10' : 'border-white/10 bg-slate-950/40'}`}><div className="text-2xl">{achievement.unlocked ? '🏆' : '🔒'}</div><div className="mt-2 font-bold text-white">{achievement.title}</div><p className="mt-1 text-xs text-slate-400">{achievement.description}</p><div className="mt-3 text-xs text-slate-500">{fmt(achievement.current)} / {fmt(achievement.target)}</div></div>)}</div></Panel>
        <Panel title="Mystery reward" subtitle="Free daily reward; unlock it after a mission or skill game."><button disabled={busy === 'mystery'} onClick={openMystery} className={primaryButton}>{busy === 'mystery' ? 'Opening…' : '🎁 Open free reward'}</button></Panel>
      </div>}

      {section === 'battles' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Panel title="Community photo battles" subtitle="Vote once per battle. Voting closes after 10 minutes."><div className="space-y-4">{battles.map((battle) => <article key={battle.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="font-bold text-white">{battle.title}</div><span className="text-xs text-slate-500">{battle.status}</span></div><div className="grid grid-cols-2 gap-3">{[[battle.challenger,battle.challengerPost,'CHALLENGER'],[battle.opponent,battle.opponentPost,'OPPONENT']].map(([player,photo,choice]) => <div key={choice} className="overflow-hidden rounded-xl border border-white/10"><div className="p-2 text-xs font-semibold text-slate-300">@{player?.username || 'waiting'}</div>{photo?.imageUrl && <img src={photo.imageUrl} alt={photo.caption || 'Battle photo'} className="aspect-square w-full object-cover"/>}<div className="p-2 text-xs text-slate-400">{photo?.caption}</div><button disabled={battle.status !== 'OPEN' || Boolean(busy)} onClick={() => voteBattle(battle.id, choice)} className={secondaryButton + ' m-2'}>Vote for this photo</button></div>)}</div><div className="mt-3 text-xs text-slate-500">Votes: {battle.challengerVotes || 0} — {battle.opponentVotes || 0} · Reward: {fmt(battle.reward)} pts</div></article>)}{battles.length === 0 && <p className="py-6 text-sm text-slate-500">No battles yet. Start one using photos from both players.</p>}</div></Panel>
        <Panel title="Create a photo battle" subtitle="Choose one photo you own and one public photo from your opponent.">
          <form onSubmit={loadOpponentPosts} className="space-y-3"><label className="block text-xs text-slate-400">Opponent username<input value={opponentUsername} onChange={(e) => setOpponentUsername(e.target.value)} className={inputClass} placeholder="username"/></label><button className={secondaryButton}>Load battle photos</button></form>
          {myPosts.length > 0 && opponentPosts.length > 0 && <form onSubmit={createBattle} className="mt-4 space-y-3"><label className="block text-xs text-slate-400">Your photo<select value={myBattlePostId} onChange={(e) => setMyBattlePostId(e.target.value)} className={inputClass}>{myPosts.map((p) => <option key={p.id} value={p.id}>{p.caption || p.id}</option>)}</select></label><label className="block text-xs text-slate-400">Opponent photo<select value={opponentBattlePostId} onChange={(e) => setOpponentBattlePostId(e.target.value)} className={inputClass}>{opponentPosts.map((p) => <option key={p.id} value={p.id}>{p.caption || p.id}</option>)}</select></label><button disabled={busy === 'battle'} className={primaryButton}>Challenge to battle</button></form>}
        </Panel>
      </div>}

      {section === 'games' && <Panel title="Quick Tap" subtitle="Free 10-second reaction practice. A server-created session validates the maximum possible score."><div className="rounded-2xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5 text-center"><div className="text-xs font-bold uppercase tracking-widest text-violet-300">Time remaining</div><div className="my-3 text-5xl font-black text-white">{gameSession ? gameRemaining : '10'}s</div><div className="mb-4 text-sm text-slate-400">Score: {gameScore} taps · Max 120</div><button disabled={!gameSession || gameRemaining <= 0} onClick={tapGame} className="h-28 w-full rounded-2xl bg-violet-500 text-2xl font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">{gameSession ? 'TAP!' : 'Start a round first'}</button><button disabled={Boolean(busy) || Boolean(gameSession)} onClick={startGame} className={primaryButton + ' mt-4'}>{busy === 'game' ? 'Starting…' : 'Start 10-second game'}</button><p className="mt-3 text-xs text-slate-500">Up to five reward attempts per UTC day. Score is capped and validated server-side.</p></div></Panel>}

      {section === 'teams' && <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]"><Panel title="Create a team" subtitle="Build a team ranking with your friends."><form onSubmit={createTeam} className="space-y-3"><label className="block text-xs text-slate-400">Team name<input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={40} className={inputClass}/></label><label className="block text-xs text-slate-400">Description<textarea value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} maxLength={300} className={inputClass}/></label><button disabled={busy === 'team'} className={primaryButton}>Create team</button></form></Panel><Panel title="Team ranking" subtitle="Ranked by total points of current members."><div className="space-y-3">{teams.slice().sort((a,b) => b.totalPoints-a.totalPoints).map((team,i) => <div key={team.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 font-black">{i+1}</span><div className="min-w-0 flex-1"><div className="font-bold text-white">{team.name}</div><div className="text-xs text-slate-500">{team.memberCount} members · {fmt(team.totalPoints)} points</div><div className="text-xs text-slate-400">{team.description}</div></div><button disabled={Boolean(busy)} onClick={() => joinTeam(team.id)} className={secondaryButton}>Join</button></div>)}</div></Panel></div>}

      {section === 'referrals' && <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Panel title="Your referral link" subtitle="Copy and share it. The daily +30 share reward can be claimed once each day."><div className="break-all rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-cyan-200">{referral?.referralUrl || `${window.location.origin}/register?ref=${encodeURIComponent(me?.username || '')}`}</div><div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={claimReferralShare} disabled={busy === 'referral'} className={primaryButton}>{busy === 'referral' ? 'Claiming…' : 'Copy link + claim 30 points'}</button><span className="text-sm text-slate-400">Successful referrals: {referral?.referralCount || 0}</span></div><p className="mt-3 text-xs text-slate-500">A new account can claim a referral once. The referrer receives +10,000 points when the referral is accepted.</p></Panel><Panel title="Referral safety" subtitle="Rewards are one-time per account."><ul className="space-y-2 text-sm text-slate-400"><li>• Self-referrals are rejected.</li><li>• Duplicate referral claims are rejected by a unique database constraint.</li><li>• Rewards are recorded in the point transaction history.</li></ul></Panel></div>}

      {section === 'messages' && <div className="grid gap-5 xl:grid-cols-[320px_1fr]"><Panel title="Open conversation" subtitle="Use a username to load private messages."><form onSubmit={loadMessages} className="space-y-3"><label className="block text-xs text-slate-400">Username<input value={messageTarget} onChange={(e) => setMessageTarget(e.target.value)} className={inputClass} placeholder="username"/></label><button className={secondaryButton}>Load messages</button></form></Panel><Panel title={messageTarget ? `Conversation with @${messageTarget}` : 'Messages'} subtitle="Messages are stored in the database."><div className="mb-4 max-h-[55vh] space-y-2 overflow-y-auto">{messages.map((msg) => <div key={msg.id} className={`rounded-xl p-3 text-sm ${msg.senderId === me?.id ? 'ml-8 bg-violet-500/15' : 'mr-8 bg-slate-950/50'}`}><div className="whitespace-pre-wrap break-words text-slate-100">{msg.body}</div><div className="mt-1 text-[10px] text-slate-500">{dateText(msg.createdAt)}</div></div>)}{messages.length === 0 && <p className="py-5 text-sm text-slate-500">Choose a username to view a conversation.</p>}</div><form onSubmit={sendMessage} className="flex gap-2"><input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder="Write a message…" className={inputClass}/><button disabled={busy === 'message' || !messageTarget} className={primaryButton}><Send size={16}/></button></form></Panel></div>}

      {section === 'notifications' && <Panel title="Notifications" subtitle="Point transfers, follows, battle invitations and system notices."><div className="space-y-2">{notifications.map((n) => <div key={n.id} className={`flex items-start gap-3 rounded-xl p-3 ${n.readAt ? 'bg-slate-950/30' : 'bg-violet-500/10'}`}><Bell size={17} className="mt-1 shrink-0 text-violet-300"/><div className="min-w-0 flex-1"><p className="text-sm text-slate-200">{n.text}</p><p className="mt-1 text-xs text-slate-500">{dateText(n.createdAt)}</p></div>{!n.readAt && <button onClick={() => markNotification(n)} className="text-xs font-semibold text-violet-300">Mark read</button>}</div>)}{notifications.length === 0 && <p className="py-6 text-sm text-slate-500">No notifications yet.</p>}</div></Panel>}

      {section === 'profile' && <div className="grid gap-5 xl:grid-cols-[360px_1fr]"><Panel title="Profile" subtitle="Your account information and public stats."><form onSubmit={async (event) => { event.preventDefault(); try { const {data} = await api.patch('/me/profile',{displayName,bio,avatarUrl:me?.avatarUrl||''}); setMe(data); setUser(data); tell('Profile saved.'); } catch(e) { tell(errText(e),'error'); } }} className="space-y-3"><div className="flex items-center gap-3"><Avatar user={profileUsername ? profile : me} size="lg"/><div><div className="font-bold text-white">@{profileUsername || me?.username}</div><div className="text-sm text-slate-500">{fmt((profileUsername ? profile?.points : me?.points) || 0)} points</div></div></div>{(!profileUsername || profileUsername === me?.username) ? <><label className="block text-xs text-slate-400">Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} className={inputClass}/></label><label className="block text-xs text-slate-400">Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} className={inputClass}/></label><button className={primaryButton}>Save profile</button></> : <><p className="text-sm text-slate-400">{profile?.bio || 'No bio yet.'}</p><div className="text-sm text-slate-400">Followers: {profile?.followers || 0} · Following: {profile?.following || 0} · Posts: {profile?.postCount || 0}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleFollow(profileUsername)} className={primaryButton}>Follow / Unfollow</button><button type="button" onClick={() => { setMessageTarget(profileUsername); setSection('messages'); }} className={secondaryButton}>Message</button></div></>}</form></Panel><Panel title={profileUsername === me?.username ? 'Your posts' : `@${profileUsername} posts`} subtitle="Photo posts"><div className="grid gap-3 sm:grid-cols-2">{(profileUsername === me?.username ? posts.filter((p) => p.author?.username === me?.username) : profilePosts).map((post) => <div key={post.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">{post.imageUrl && <img src={post.imageUrl} alt="" className="aspect-[4/3] w-full object-cover"/>}<div className="p-3 text-sm"><p className="text-slate-200">{post.caption}</p><p className="mt-2 font-bold text-amber-200">{fmt(post.points)} points</p></div></div>)}</div></Panel></div>}

      {section === 'search' && <Panel title="Find players" subtitle="Search by username or display name."><form onSubmit={findUsers} className="mb-4 flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search username…" className={inputClass}/><button className={primaryButton}><Search size={16}/></button></form><div className="space-y-2">{users.map((player) => <div key={player.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><Avatar user={player}/><div className="min-w-0 flex-1"><button onClick={() => { setProfileUsername(player.username); loadProfile(player.username); setSection('profile'); }} className="font-bold text-white">@{player.username}</button><div className="text-xs text-slate-500">{player.displayName} · {fmt(player.points)} points</div></div>{player.username !== me?.username && <button onClick={() => toggleFollow(player.username)} className={secondaryButton}>Follow</button>}</div>)}</div></Panel>}

      {section === 'admin' && me?.role === 'ADMIN' && <div className="space-y-5">
        <Panel title="Admin point adjustment" subtitle="Every adjustment is recorded in the audit log."><form onSubmit={adjustPoints} className="grid gap-3 md:grid-cols-4"><input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="Username" className={inputClass}/><input type="number" step="1" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} className={inputClass}/><input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className={inputClass}/><button disabled={busy === 'admin-points'} className={primaryButton}>Adjust points</button></form></Panel>
        <Panel title="User moderation" subtitle="Suspend, ban, or reactivate accounts."><div className="space-y-2">{adminUsers.map((player) => <div key={player.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-950/50 p-3"><div className="min-w-0 flex-1"><div className="font-bold text-white">@{player.username}</div><div className="text-xs text-slate-500">{player.status} · {fmt(player.points)} points</div></div><button onClick={() => changeStatus(player.username, player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')} className={secondaryButton}>{player.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button><button onClick={() => changeStatus(player.username, 'BANNED')} className={secondaryButton}>Ban</button></div>)}</div></Panel>
        <Panel title="Post moderation" subtitle="Hide or restore community photos."><div className="space-y-2">{posts.map((post) => <div key={post.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><div className="min-w-0 flex-1"><div className="font-bold text-white">{post.author?.username}</div><div className="truncate text-xs text-slate-500">{post.caption}</div></div><button onClick={() => moderatePost(post.id, !post.hidden)} className={secondaryButton}>{post.hidden ? 'Restore' : 'Hide'}</button></div>)}</div></Panel>
        <Panel title="Reports" subtitle="Review user-submitted reports."><div className="space-y-2">{reports.map((report) => <div key={report.id} className="rounded-xl bg-slate-950/50 p-3"><div className="font-bold text-white">{report.category} · {report.targetType}</div><div className="text-xs text-slate-500">{report.details || report.targetId}</div><div className="mt-2 flex gap-2">{['REVIEWING','RESOLVED','DISMISSED'].map((status) => <button key={status} onClick={() => updateReport(report.id,status)} className={secondaryButton}>{status}</button>)}</div></div>)}</div></Panel>
        <Panel title="Global notification" subtitle="Send an announcement to all active users."><form onSubmit={sendGlobalNotice} className="space-y-3"><textarea value={globalText} onChange={(e) => setGlobalText(e.target.value)} maxLength={500} className={inputClass} placeholder="Announcement…"/><button className={primaryButton}>Send notification</button></form></Panel>
        <Panel title="Latest audit logs" subtitle="Administrative changes"><div className="space-y-2">{auditLogs.map((log) => <div key={log.id} className="rounded-lg bg-slate-950/50 p-3 text-sm"><strong>{log.action}</strong> · {log.actor?.username} · {log.details}<div className="text-xs text-slate-500">{dateText(log.createdAt)}</div></div>)}</div></Panel>
        <Panel title="Recent transactions" subtitle="Latest 200 point movements"><div className="space-y-2">{adminTransactions.map((tx) => <div key={tx.id} className="rounded-lg bg-slate-950/50 p-3 text-sm">{tx.type} · {fmt(tx.amount)} · @{tx.sender?.username || 'system'} → @{tx.receiver?.username || '—'}<div className="text-xs text-slate-500">{dateText(tx.createdAt)}</div></div>)}</div></Panel>
      </div>}

      {reportTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><form onSubmit={submitReport} className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5"><h2 className="text-xl font-bold text-white">Report content</h2><select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className={inputClass}>{['SPAM','HARASSMENT','FAKE_ACCOUNT','ILLEGAL_CONTENT','COPYRIGHT','ABUSE','OTHER'].map((value) => <option key={value}>{value}</option>)}</select><textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} maxLength={1000} placeholder="Details (optional)" className={inputClass}/><div className="flex gap-2"><button type="button" onClick={() => setReportTarget(null)} className={secondaryButton}>Cancel</button><button disabled={busy === 'report'} className={primaryButton}>Submit report</button></div></form></div>}
    </main>
  </div>;
}

export default SocialGamingApp;
