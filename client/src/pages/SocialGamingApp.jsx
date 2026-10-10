import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, ArrowDownRight, Bell, Camera, Check, ChevronRight, Crown, Gift, Menu, X,
  Gamepad2, Heart, ImagePlus, LoaderCircle, LogOut, MessageCircle, Plus,
  RefreshCw, Search, Send, Share2, Shield, Swords, Trophy, Users, Wallet, Zap, Sun, Moon, Languages, MoreHorizontal, Trash2, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const fmt = (n) => new Intl.NumberFormat().format(Number(n || 0));
const dateText = (value) => value ? new Date(value).toLocaleString() : '';
const editCooldownLabel = (lastEditedAt) => {
  if (!lastEditedAt) return 'Edit photo/caption';
  const remaining = new Date(lastEditedAt).getTime() + 4 * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return 'Edit photo/caption';
  const minutes = Math.ceil(remaining / 60000);
  return `Edit in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const errText = (e, fallback = 'Something went wrong. Please try again.') => e?.response?.data?.error || e?.message || fallback;
const menu = [
  ['home', 'Home', Activity], ['search', 'Find Players', Search], ['ranking', 'Ranking', Trophy], ['wallet', 'Wallet', Wallet],
  ['missions', 'Missions', Zap], ['battles', 'Photo Battles', Swords], ['games', 'Mini Games', Gamepad2],
  ['teams', 'Teams', Users], ['referrals', 'Referral', Gift], ['messages', 'Messages', MessageCircle],
  ['notifications', 'Notifications', Bell], ['profile', 'My Profile', Shield]
];

function Avatar({ user, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  return user?.avatarUrl
    ? <img src={user.avatarUrl} alt="" className={`${sizeClass} rounded-full object-cover`} />
    : <div className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-sky-500 font-black text-white`}>{(user?.displayName || user?.username || 'U').slice(0,1).toUpperCase()}</div>;
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
  const [section, setSection] = useState(() => {
    const routeSection = new URLSearchParams(window.location.search).get('section');
    const routePath = window.location.pathname;
    if (routePath.startsWith('/profile/') || routeSection === 'profile') return 'profile';
    if (menu.some(([key]) => key === routeSection) || ['admin', 'privacy'].includes(routeSection)) return routeSection;
    return 'home';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState(null);
  const [theme, setTheme] = useState(() => window.localStorage.getItem('vibepulse-theme') || 'light');
  const [language, setLanguage] = useState(() => window.localStorage.getItem('vibepulse-language') || 'en');
  const [openPostMenu, setOpenPostMenu] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const avatarPickerRef = useRef(null);
  const coverPickerRef = useRef(null);
  const [me, setMe] = useState(user);
  const [posts, setPosts] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [risingUsers, setRisingUsers] = useState([]);
  const [period, setPeriod] = useState('overall');
  const [transactions, setTransactions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [battles, setBattles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [drafts, setDrafts] = useState(() => { try { return JSON.parse(window.localStorage.getItem(`vibepulse-drafts:${user?.username || 'guest'}`) || '[]'); } catch { return []; } });
  const [referral, setReferral] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileListModal, setProfileListModal] = useState('');
  const [profileListUsers, setProfileListUsers] = useState([]);
  const [profileListLoading, setProfileListLoading] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [followersVisibility, setFollowersVisibility] = useState('PUBLIC');
  const [followingVisibility, setFollowingVisibility] = useState('PUBLIC');
  const [profileUsername, setProfileUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [inboxSearch, setInboxSearch] = useState('');
  const [messageTarget, setMessageTarget] = useState('');
  const [messageText, setMessageText] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPosts, setAdminPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stealCountdowns, setStealCountdowns] = useState({});
  const [busy, setBusy] = useState('');
  const [caption, setCaption] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [imageFile, setImageFile] = useState(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl || '');
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
      api.get('/points/transactions?limit=50'), api.get('/referrals/me'), api.get('/leaderboard/daily'), api.get('/trending'), api.get('/rising-users')
    ]);
    const take = (i, setter) => {
      // Keep the last successful data visible when a request temporarily fails.
      // Do not replace the feed with an empty list during a slow/retrying request.
      if (jobs[i].status === 'fulfilled') setter(jobs[i].value.data);
    };
    take(0, (value) => { setMe(value); setUser(value); setDisplayName(value.displayName || ''); setBio(value.bio || ''); setAvatarUrl(value.avatarUrl || ''); setCoverUrl(value.coverUrl || ''); });
    take(1, (value) => {
      // Some API/proxy responses can briefly return an empty or wrapped feed while
      // the database wakes up. Never blank an already-visible feed in that case.
      const next = Array.isArray(value) ? value
        : Array.isArray(value?.posts) ? value.posts
        : Array.isArray(value?.items) ? value.items
        : null;
      if (next === null) return;
      setPosts((current) => (next.length === 0 && current.length > 0 ? current : next));
    }); take(2, setLeaderboard); take(3, setMissions);
    take(4, setAchievements); take(5, setBattles); take(6, setTeams);
    take(7, setNotifications); take(8, setTransactions); take(9, setReferral);
    take(10, setDailyLeaderboard); take(11, setTrending); take(12, setRisingUsers);
    setLoading(false);
  }, [setUser]);

  useEffect(() => { loadCore(); }, [loadCore]);
  // The URL is the source of truth so refreshing a section keeps the same page.
  useEffect(() => {
    const routeSection = new URLSearchParams(location.search).get('section');
    if (location.pathname.startsWith('/profile/')) {
      if (section !== 'profile') setSection('profile');
      return;
    }
    if (routeSection && (menu.some(([key]) => key === routeSection) || ['admin', 'privacy'].includes(routeSection))) {
      if (section !== routeSection) setSection(routeSection);
    } else if (!routeSection && section !== 'home') {
      setSection('home');
    }
  }, [location.pathname, location.search]);
  useEffect(() => { window.localStorage.setItem('vibepulse-theme', theme); }, [theme]);
  useEffect(() => { window.localStorage.setItem('vibepulse-language', language); }, [language]);
  useEffect(() => { try { setDrafts(JSON.parse(window.localStorage.getItem(`vibepulse-drafts:${me?.username || user?.username || 'guest'}`) || '[]')); } catch { setDrafts([]); } }, [me?.username, user?.username]);
  useEffect(() => { try { window.localStorage.setItem(`vibepulse-drafts:${me?.username || user?.username || 'guest'}`, JSON.stringify(drafts)); } catch {} }, [drafts, me?.username, user?.username]);
  useEffect(() => { api.get('/follows/me').then(({ data }) => setFollowingUsers(Array.isArray(data) ? data : [])).catch(() => {}); }, []);
  const loadInbox = useCallback(async () => { try { const { data } = await api.get('/messages/inbox'); setInbox(Array.isArray(data) ? data : []); } catch {} }, []);
  useEffect(() => { const refresh = async () => { try { const { data } = await api.get('/notifications'); setNotifications(Array.isArray(data) ? data : []); } catch {} }; refresh(); const timer = window.setInterval(refresh, 10000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (section !== 'messages') return undefined; loadInbox(); const timer = window.setInterval(() => { loadInbox(); if (messageTarget) api.get('/messages/' + encodeURIComponent(messageTarget)).then(({data}) => setMessages(Array.isArray(data) ? data : [])).catch(() => {}); }, 3000); return () => window.clearInterval(timer); }, [section, messageTarget, loadInbox]);
  const bn = language === 'bn';
  useEffect(() => {
    if (!Object.values(stealCountdowns).some((seconds) => seconds > 0)) return undefined;
    const timer = window.setInterval(() => setStealCountdowns((old) => { const next = { ...old }; Object.keys(next).forEach((key) => { next[key] = Math.max(0, Number(next[key] || 0) - 1); if (next[key] === 0) delete next[key]; }); return next; }), 1000);
    return () => window.clearInterval(timer);
  }, [stealCountdowns]);

  useEffect(() => {
    const postId = new URLSearchParams(location.search).get('post');
    if (!postId) return undefined;
    const timer = window.setTimeout(() => document.getElementById('post-' + postId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    return () => window.clearTimeout(timer);
  }, [posts, location.search]);

  useEffect(() => {
    const routeUsername = new URLSearchParams(location.search).get('username');
    const routeSection = new URLSearchParams(location.search).get('section');
    const username = params.username || routeUsername || (routeSection === 'profile' ? me?.username : '');
    if ((location.pathname.startsWith('/profile/') || routeSection === 'profile') && username) {
      setSection('profile');
      if (profileUsername !== username) setProfileUsername(username);
      loadProfile(username);
    }
  }, [location.pathname, location.search, params.username, me?.username]);

  const openProfileList = async (kind) => {
    const username = profileUsername || me?.username;
    if (!username) return;
    setProfileListModal(kind);
    setProfileListUsers([]);
    setProfileListLoading(true);
    try {
      const endpoint = kind === 'followers' ? 'followers' : 'following';
      const { data } = await api.get(`/users/${encodeURIComponent(username)}/${endpoint}`);
      setProfileListUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      tell(errText(e, 'Could not load this list.'), 'error');
    } finally {
      setProfileListLoading(false);
    }
  };

  const loadProfile = async (username) => {
    if (!username) return;
    try {
      const [p, ps] = await Promise.all([
        api.get(`/users/${encodeURIComponent(username)}/profile`),
        api.get(`/users/${encodeURIComponent(username)}/posts`)
      ]);
      setProfile(p.data); setProfilePosts(ps.data); setProfileUsername(username);
      if (username.toLowerCase() === String(me?.username || '').toLowerCase()) {
        setFollowersVisibility(p.data.followersVisibility || 'PUBLIC');
        setFollowingVisibility(p.data.followingVisibility || 'PUBLIC');
      }
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

  const collectFromPlayer = async (username) => {
    if (!username || username === me?.username) return;
    setBusy(`steal-player:${username}`);
    try {
      const { data } = await api.get(`/users/${encodeURIComponent(username)}/posts`);
      const candidate = Array.isArray(data) ? data.find((post) => post?.id && post.author?.username !== me?.username && post.privacy === 'PUBLIC') : null;
      if (!candidate) {
        tell(`@ ${username} has no public post available for point transfer.`.replace('@ ', '@'), 'error');
        return;
      }
      await collectPoints(candidate);
    } catch (e) {
      tell(errText(e, 'Could not load a public post from this player.'), 'error');
    } finally {
      setBusy((old) => old === `steal-player:${username}` ? '' : old);
    }
  };

  const collectPoints = async (post) => {
    if (!post?.id || post.author?.username === me?.username) return;
    setBusy(`steal:${post.id}`);
    try {
      const { data } = await api.post(`/posts/${encodeURIComponent(post.id)}/steal`);
      setStealCountdowns((old) => ({ ...old, [post.id]: 4 }));
      tell(`🥷 Took ${fmt(data.stolen)} points from @${post.author?.username}'s post and added them to your post.`);
      await Promise.all([refreshMe(), loadCore()]);
    } catch (e) { tell(errText(e, 'Point collection failed.'), 'error'); }
    finally { setBusy((old) => old === `steal:${post.id}` ? '' : old); }
  };

  const giftPoints = async (event) => {
    event.preventDefault();
    const amount = Number(giftAmount);
    if (!giftUsername.trim() || !Number.isInteger(amount) || amount < 1) return tell('Enter a username and a positive whole-number amount.', 'error');
    setBusy('gift');
    try {
      const { data } = await api.post('/points/gift', { username: giftUsername.trim().replace(/^@/, ''), amount });
      tell(`🎁 ${fmt(amount)} points sent. Remaining balance: ${fmt(data.balance)}.`);
      setGiftUsername('');
      await Promise.all([refreshMe(), loadCore()]);
    } catch (e) { tell(errText(e, 'Gift failed.'), 'error'); }
    finally { setBusy(''); }
  };

  const giftPostAuthor = async (post) => {
    const username = post?.author?.username;
    if (!username || username === me?.username) return;
    const rawAmount = window.prompt(`How many points would you like to gift @${username}?`, '10');
    if (rawAmount === null) return;
    const amount = Number(rawAmount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) {
      tell('Enter a whole-number amount from 1 to 1,000,000.', 'error');
      return;
    }
    setBusy(`gift-post:${post.id}`);
    try {
      const { data } = await api.post('/points/gift', { username: username.replace(/^@/, ''), amount });
      tell(`🎁 ${fmt(amount)} points sent to @${username}. Remaining balance: ${fmt(data.balance)}.`);
      await Promise.all([refreshMe(), loadCore()]);
    } catch (e) {
      tell(errText(e, 'Gift failed.'), 'error');
    } finally {
      setBusy('');
    }
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
      if (!finalUrl && !caption.trim()) return tell('Write something or choose a photo first.', 'error');
      await api.post('/posts', { imageUrl: finalUrl || undefined, caption: caption.trim(), privacy });
      setCaption(''); setImageUrl(''); setImageFile(null);
      const fileInput = document.getElementById('arena-photo-file'); if (fileInput) fileInput.value = '';
      tell('Post published! The first five posts each UTC day can earn points.');
      await loadCore();
    } catch (e) { tell(errText(e, 'Could not publish photo. Image uploads require server-side Supabase Storage configuration.'), 'error'); }
    finally { setBusy(''); }
  };

  const deletePost = async (post) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusy('delete:' + post.id);
    try { await api.delete('/posts/' + encodeURIComponent(post.id)); setPosts((old) => old.filter((item) => item.id !== post.id)); setProfilePosts((old) => old.filter((item) => item.id !== post.id)); tell('Post deleted.'); await loadCore(); }
    catch (e) { tell(errText(e, 'Could not delete post.'), 'error'); } finally { setBusy(''); }
  };
  const addPointsToPost = async (post) => {
    const raw = window.prompt('Add points from your wallet. Available: ' + fmt(me?.points) + ' points.', '10');
    if (raw === null) return; const amount = Number(raw);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) return tell('Enter a whole number from 1 to 1,000,000.', 'error');
    if (amount > Number(me?.points || 0)) return tell('You do not have enough points.', 'error');
    setBusy('invest:' + post.id);
    try { const { data } = await api.post('/posts/' + encodeURIComponent(post.id) + '/invest', { amount }); tell('Added ' + fmt(amount) + ' points to your post. Post total: ' + fmt(data.postPoints) + '.'); await Promise.all([refreshMe(), loadCore()]); }
    catch (e) { tell(errText(e, 'Could not add points to post.'), 'error'); } finally { setBusy(''); }
  };
  useEffect(() => {
    if (section !== 'messages' || !messageTarget) return undefined;
    const timer = window.setInterval(async () => { try { const { data } = await api.get('/messages/' + encodeURIComponent(messageTarget)); setMessages(Array.isArray(data) ? data : []); } catch {} }, 3000);
    return () => window.clearInterval(timer);
  }, [section, messageTarget]);

  const openConversation = async (username) => {
    const target = String(username || '').trim().replace(/^@/, '');
    if (!target || target.toLowerCase() === String(me?.username || '').toLowerCase()) return tell('Choose another user to message.', 'error');
    setMessageTarget(target); setSection('messages');
    try { const { data } = await api.get('/messages/' + encodeURIComponent(target)); setMessages(Array.isArray(data) ? data : []); }
    catch (e) { setMessages([]); tell(errText(e, 'Could not open chat with @' + target + '.'), 'error'); }
  };
  const editOwnPost = async (post) => {
    const editLabel = editCooldownLabel(post.lastEditedAt);
    if (editLabel !== 'Edit photo/caption') return tell(`This post can be edited again in ${editLabel.replace('Edit in ', '')}.`, 'error');
    const nextCaption = window.prompt('Edit caption', post.caption || '');
    if (nextCaption === null) return;
    const nextImageUrl = window.prompt('Photo URL (HTTPS)', post.imageUrl || '');
    if (nextImageUrl === null) return;
    if (!nextImageUrl.trim()) return tell('A photo URL is required.', 'error');
    setBusy('edit:' + post.id);
    try { await api.patch(`/posts/${post.id}`, { caption: nextCaption, imageUrl: nextImageUrl.trim(), privacy: post.privacy || 'PUBLIC' }); tell('Post updated. The next edit is available after four hours.'); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const sharePost = async (post) => {
    const url = new URL(window.location.origin);
    url.searchParams.set('post', post.id);
    try {
      if (navigator.share) await navigator.share({ title: 'VibePulse photo', text: post.caption || ('Photo by @' + post.author?.username), url: url.toString() });
      else { await navigator.clipboard.writeText(url.toString()); tell('Post link copied.'); }
    } catch (e) {
      if (e?.name !== 'AbortError') tell('Could not share this post from the browser.', 'error');
    }
  };

  const likePost = async (postId) => {
    setBusy('like:' + postId);
    try { await api.post(`/posts/${postId}/like`); tell('Liked the photo. +1 point was awarded by the server.'); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const addComment = async (event, postId) => {
    event.preventDefault();
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;
    setBusy('comment:' + postId);
    try { await api.post(`/posts/${postId}/comments`, { body }); setCommentDrafts((old) => ({ ...old, [postId]: '' })); tell('Comment posted.'); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
    finally { setBusy(''); }
  };

  const saveDraft = () => {
    const text = caption.trim(); const link = imageUrl.trim();
    if (!text && !link && !imageFile) return tell('Write something or add a photo before saving a draft.', 'error');
    setDrafts((old) => [{ id: `${Date.now()}`, caption: text, imageUrl: link, privacy, savedAt: new Date().toISOString() }, ...old].slice(0, 20));
    tell('Draft saved on this device.');
  };

  const toggleFollow = async (username) => {
    setBusy(`follow:${username}`);
    try {
      const { data } = await api.post(`/follows/${encodeURIComponent(username)}`);
      setFollowingUsers((old) => data.following ? [...new Set([...old, username])] : old.filter((name) => name !== username));
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
      const target = messageTarget.trim().replace(/^@/, '');
      const { data: sent } = await api.post('/messages', { toUsername: target, body: messageText.trim() });
      if (!sent?.id) throw new Error('The server did not confirm the message. Please try again.');
      setMessageText('');
      const { data } = await api.get('/messages/' + encodeURIComponent(target));
      setMessages(Array.isArray(data) ? data : []); tell('Message sent.');
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
              const { data } = await api.post(`/games/quick-tap/${gameSession.id}/finish`, {});
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

  const tapGame = async () => {
    if (!gameSession || gameRemaining <= 0) return;
    try {
      const { data } = await api.post(`/games/quick-tap/${gameSession.id}/tap`, {});
      const acceptedScore = Math.max(gameScoreRef.current, Number(data.score || 0));
      gameScoreRef.current = acceptedScore;
      setGameScore(acceptedScore);
    } catch (e) {
      tell(errText(e, 'Tap was not accepted.'), 'error');
    }
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

  const finishBattle = async (battleId) => {
    setBusy('finish:' + battleId);
    try { const { data } = await api.post(`/battles/${battleId}/finish`); tell(data.winnerId ? 'Battle finished and winner reward was credited.' : 'Battle finished in a tie.'); await loadCore(); }
    catch (e) { tell(errText(e), 'error'); }
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
    if (results[4].status === 'fulfilled') setAdminPosts(results[4].value.data || []);
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
  const unreadCount = notifications.filter((item) => !item.readAt && !/new message|sent you a message|message from @|sent a message/i.test(item.text || "")).length;
  const unreadMessagesCount = inbox.reduce((sum, item) => sum + Number(item.unread || 0), 0);

  const navTo = (key) => {
    setMenuOpen(false);
    setSection(key);
    if (key === 'profile') {
      const username = me?.username;
      if (username) {
        setProfileUsername(username);
        navigate('/?section=profile&username=' + encodeURIComponent(username));
        loadProfile(username);
      }
    } else {
      navigate('/?section=' + encodeURIComponent(key));
    }
    if (key === 'ranking') loadLeaderboard('overall');
    if (key === 'admin') loadAdmin();
  };

  const primaryButton = 'rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryButton = 'inline-flex max-w-full min-w-0 items-center justify-center whitespace-normal break-words rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm';
  const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400/70';

  return <div className={theme === "dark" ? "min-h-screen w-full max-w-full overflow-x-hidden bg-black text-slate-100" : "light-mode min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900"}>
      <style>{`.light-mode .bg-black,.light-mode .bg-black\\/95{background:#fff!important}.light-mode .text-white{color:#111827!important}.light-mode .text-slate-100,.light-mode .text-slate-200,.light-mode .text-slate-300{color:#1f2937!important}.light-mode .text-slate-400,.light-mode .text-slate-500{color:#64748b!important}.light-mode .bg-slate-950\\/50,.light-mode .bg-slate-950\\/60,.light-mode .bg-slate-950\\/70{background:#f1f5f9!important}.light-mode .border-white\\/10{border-color:#dbe2ea!important} .light-mode .bg-white\\/\\[0\\.045\\],.light-mode .bg-white\\/5{background:#fff!important}.light-mode .bg-white\\/\\[0\\.07\\],.light-mode .bg-white\\/10{background:#f1f5f9!important}.light-mode .text-slate-300,.light-mode .text-slate-200{color:#334155!important}.light-mode .text-amber-100,.light-mode .text-amber-200{color:#92400e!important}.light-mode .text-emerald-300{color:#047857!important}.light-mode .text-sky-200,.light-mode .text-sky-300{color:#0369a1!important}.light-mode .text-rose-300{color:#be123c!important}.light-mode .bg-slate-900{background:#fff!important}.light-mode input,.light-mode textarea,.light-mode select{background:#fff!important;color:#111827!important;border-color:#cbd5e1!important}`}</style>
    <header className="sticky top-0 z-40 w-full max-w-full border-b border-white/10 bg-black/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <button type="button" aria-label="Open menu" title="Menu and settings" onClick={() => setMenuOpen((v) => !v)} className={secondaryButton}><Menu size={19}/></button>
        <button onClick={() => navTo('home')} className="flex items-center gap-2 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-500"><Zap size={21} className="text-white"/></span>
          <span><span className="block text-lg font-black tracking-tight text-white">VibePulse</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Social network</span></span>
        </button>
        <div className="flex items-center gap-1"><button title="Notifications" onClick={async () => { const unread=notifications.filter(n=>!n.readAt); await Promise.all(unread.map(n=>api.post(`/notifications/${n.id}/read`).catch(()=>null))); setNotifications(old=>old.map(n=>({...n,readAt:n.readAt||new Date().toISOString()}))); navTo("notifications"); }} className={secondaryButton}><Bell size={17}/>{unreadCount>0&&<span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{unreadCount}</span>}</button><button title="Light/dark mode" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={secondaryButton}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button><button title="Language" onClick={() => setLanguage(bn ? "en" : "bn")} className={secondaryButton}><Languages size={16}/>{bn ? " EN" : " বাংলা"}</button></div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2"><Zap size={16} className="text-amber-200"/><span className="text-sm font-black text-amber-100">{fmt(me?.points)}</span><span className="hidden text-xs text-amber-200/70 sm:inline">POINTS</span></div>
        <div className="flex items-center gap-2">
          <input ref={avatarPickerRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async (e) => { const file=e.target.files?.[0]; if(!file)return; try { const fd=new FormData(); fd.append("file",file); const up=await api.post("/media/upload",fd); const saved=await api.patch("/me/profile",{avatarUrl:up.data.url}); setMe(saved.data); setUser(saved.data); setAvatarUrl(saved.data.avatarUrl||up.data.url); tell("Profile picture updated."); } catch(err) { tell(errText(err,"Could not upload profile picture."),"error"); } finally { e.target.value=""; } }}/><button type="button" title="Click profile picture to change it" className={secondaryButton} onClick={() => avatarPickerRef.current?.click()}><span className="relative block"><Avatar user={me}/><span className="absolute bottom-0 right-0 rounded-full bg-sky-500 p-0.5 text-white"><Camera size={11}/></span></span><span className="ml-2 hidden sm:inline">@{me?.username}</span></button>
        </div>
      </div>
      
    </header>
    {menuOpen && <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}><nav onClick={(e) => e.stopPropagation()} className="absolute left-0 top-0 h-full w-[min(86vw,320px)] overflow-y-auto border-r border-slate-200 bg-white p-4 pt-20 text-slate-900 shadow-2xl"><div className="mb-4 flex items-center justify-between"><strong className="text-lg">Menu & Settings</strong><button onClick={() => setMenuOpen(false)} className="rounded-lg p-2"><X size={20}/></button></div><div className="mb-4 flex gap-2"><button onClick={() => setTheme('light')} className="flex-1 rounded-xl border px-3 py-2 text-sm">☀ Light</button><button onClick={() => setTheme('dark')} className="flex-1 rounded-xl border px-3 py-2 text-sm">☾ Night</button><button onClick={() => setLanguage(bn ? 'en' : 'bn')} className="rounded-xl border px-3 py-2 text-sm">{bn ? 'EN' : 'বাংলা'}</button></div>{menu.map(([key,label,Icon]) => <button key={key} onClick={() => navTo(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${section===key?'bg-sky-100 text-sky-800':'text-slate-700 hover:bg-slate-100'}`}><Icon size={19}/>{label}{key==='messages'&&unreadMessagesCount>0?<span className="ml-auto rounded-full bg-sky-600 px-2 text-white">{unreadMessagesCount}</span>:null}{key==='notifications'&&unreadCount>0?<span className="ml-auto rounded-full bg-rose-600 px-2 text-white">{unreadCount}</span>:null}</button>)}{me?.role==='ADMIN'&&<button onClick={()=>navTo('admin')} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700"><Shield size={19}/>Admin</button>}<button onClick={() => navTo('privacy')} className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${section === 'privacy' ? 'bg-sky-100 text-sky-800' : 'text-slate-700 hover:bg-slate-100'}`}><Settings size={19}/>Privacy settings</button><button onClick={()=>{logout();navigate('/login');}} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-700"><LogOut size={19}/>Log out</button></nav></div>}

    <div className="mx-auto grid w-full min-w-0 max-w-[1380px] grid-cols-1 gap-4 overflow-x-clip px-2 pb-24 pt-3 sm:gap-5 sm:px-5 sm:pt-5 lg:grid-cols-[220px_minmax(0,650px)_minmax(240px,300px)] lg:gap-7">
      <aside className="hidden lg:block"><nav className="sticky top-24 space-y-1">
        {menu.map(([key, label, Icon]) => <button key={key} onClick={() => navTo(key)} className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-left text-base font-semibold transition ${section === key ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={21}/><span>{bn ? ({home:'হোম',search:'মানুষ খুঁজুন',ranking:'র‍্যাঙ্কিং',wallet:'ওয়ালেট',missions:'মিশন',battles:'ছবি ব্যাটল',games:'গেম',teams:'টিম',referrals:'রেফারেল',messages:'মেসেজ',notifications:'নোটিফিকেশন',profile:'প্রোফাইল'}[key] || label) : label}</span>{key === 'notifications' && unreadCount > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}{key === 'messages' && unreadMessagesCount > 0 && <span className="ml-auto rounded-full bg-sky-500 px-2 py-0.5 text-xs text-white">{unreadMessagesCount}</span>}</button>)}
        {me?.role === 'ADMIN' && <button onClick={() => navTo('admin')} className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-left text-slate-300 hover:bg-white/10"><Shield size={21}/>Admin</button>}
        <button onClick={() => { logout(); navigate('/login'); }} className="mt-4 flex w-full items-center gap-4 rounded-full px-4 py-3 text-left text-slate-400 hover:bg-white/10"><LogOut size={20}/>Log out</button>
      </nav></aside>
      <main className="w-full min-w-0 max-w-full space-y-5">
      <Notice notice={notice} onClose={() => setNotice(null)}/>
      {loading && !me && <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={16} className="animate-spin"/> Loading your feed…</div>}

      {section === 'home' && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="flex items-center justify-between"><h1 className="text-xl font-extrabold text-white">Home</h1><button type="button" title="Refresh feed" aria-label="Refresh feed" onClick={loadCore} disabled={loading} className="rounded-full border border-white/10 p-2 text-slate-500 hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/></button></section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <Avatar user={me}/>
              <button type="button" onClick={() => setComposeOpen(true)} className="min-w-0 flex-1 rounded-full bg-white/[0.07] px-4 py-3 text-left text-sm text-slate-400 hover:bg-white/10">What’s on your mind, {me?.displayName || me?.username || 'there'}?</button>
              <button type="button" title="Add photo" onClick={() => { setComposeOpen(true); window.setTimeout(() => document.getElementById('arena-photo-file')?.click(), 0); }} className="rounded-lg p-1.5 text-emerald-400 hover:bg-white/10"><ImagePlus size={23}/></button>
              <button type="button" title="Create post" onClick={() => setComposeOpen(true)} className="rounded-lg p-1.5 text-rose-400 hover:bg-white/10"><Camera size={23}/></button>
            </div>
            {composeOpen && <form onSubmit={createPost} className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <textarea autoFocus value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000} placeholder="What’s on your mind?" className={`${inputClass} min-h-20 resize-y`}/>
              <label className="block text-xs font-semibold text-slate-400">Add photo (optional, up to 5 MB)
                <input id="arena-photo-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-slate-100"/>
              </label>
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Photo link (optional)" className={inputClass}/>
              {imageFile && <p className="text-xs text-emerald-300">Selected: {imageFile.name}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={inputClass + ' max-w-48'}>
                  <option value="PUBLIC">Public</option><option value="FOLLOWERS">Followers</option><option value="PRIVATE">Private</option>
                </select>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={saveDraft} className={secondaryButton}>Save draft</button><button type="button" onClick={() => setComposeOpen(false)} className={secondaryButton}>Close</button><button disabled={busy === 'post'} className={primaryButton}>{busy === 'post' ? 'Posting…' : 'Post'}</button></div>
              </div>
            </form>}
            {drafts.length > 0 && <div className="mt-3 border-t border-white/10 pt-3"><h3 className="mb-2 text-sm font-bold text-white">Saved drafts ({drafts.length})</h3><div className="space-y-2">{drafts.map((draft) => <div key={draft.id} className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2"><button type="button" onClick={() => { setCaption(draft.caption || ''); setImageUrl(draft.imageUrl || ''); setPrivacy(draft.privacy || 'PUBLIC'); setImageFile(null); setComposeOpen(true); }} className="min-w-0 flex-1 truncate text-left text-sm">{draft.caption || draft.imageUrl || 'Photo draft'}</button><button type="button" onClick={() => setDrafts((old) => old.filter((item) => item.id !== draft.id))} className="p-2 text-rose-300" aria-label="Delete draft"><Trash2 size={15}/></button></div>)}</div></div>}
          </section>
          <Panel title="" subtitle="">
            <div className="grid gap-4 grid-cols-1">
              {posts.map((post) => <article id={"post-" + post.id} key={post.id} className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                {post.imageUrl && <button type="button" onClick={() => setExpandedMedia({url:post.imageUrl,caption:post.caption||'',author:post.author?.username||''})} className="mt-2 block w-full cursor-zoom-in sm:mt-3"><img src={post.imageUrl} alt={post.caption || 'Community photo'} loading="lazy" className="block h-auto max-h-[65vh] w-full max-w-full rounded-xl border border-white/10 bg-black object-contain sm:max-h-[620px] sm:rounded-2xl"/></button>}
                <div className="min-w-0 space-y-3 p-2 sm:p-4">
                  <div className="flex items-center gap-3"><Avatar user={post.author}/><button onClick={() => { setProfileUsername(post.author?.username); loadProfile(post.author?.username); setSection('profile'); }} className="min-w-0 text-left"><div className="truncate text-sm font-bold text-white">{post.author?.displayName || post.author?.username}</div><div className="text-xs text-slate-500">@{post.author?.username}</div></button><span className="ml-auto text-sm font-black text-amber-200">⚡ {fmt(post.points)}</span></div>
                  {post.caption && <p style={{overflowWrap:"anywhere",wordBreak:"break-word",maxWidth:"100%"}} className="block w-full min-w-0 whitespace-pre-wrap text-sm text-slate-300">{post.caption}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{post._count?.likes || 0} likes</span><span>•</span><span>{post._count?.comments || 0} comments</span><span className="ml-auto">{dateText(post.createdAt)}</span></div>
                  <div className="grid min-w-0 grid-cols-3 gap-0.5 border-t border-white/10 pt-2 sm:gap-1">
                    <button disabled={Boolean(busy)} onClick={() => likePost(post.id)} className="flex min-w-0 flex-wrap items-center justify-center gap-1 rounded-lg px-0.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40 sm:gap-2 sm:px-2 sm:text-sm"><Heart size={17}/>Like</button>
                    <button onClick={() => document.getElementById("comment-" + post.id)?.focus()} className="flex min-w-0 flex-wrap items-center justify-center gap-1 rounded-lg px-0.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 sm:gap-2 sm:px-2 sm:text-sm"><MessageCircle size={17}/>Comment</button>
                    <button onClick={() => sharePost(post)} className="flex min-w-0 flex-wrap items-center justify-center gap-1 rounded-lg px-0.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 sm:gap-2 sm:px-2 sm:text-sm"><Share2 size={17}/>Share</button>
                  </div>
                  <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-1.5 pt-1">
                    {post.author?.username !== me?.username && <>
                      <button disabled={busy === `steal:${post.id}` || (stealCountdowns[post.id] || 0) > 0} onClick={() => collectPoints(post)} className={secondaryButton}>{busy === `steal:${post.id}` ? (bn ? 'নিচ্ছে…' : 'Stealing…') : (stealCountdowns[post.id] || 0) > 0 ? (bn ? `আবার ${stealCountdowns[post.id]}s` : `Steal in ${stealCountdowns[post.id]}s`) : <><ArrowDownRight size={15} className="mr-1 inline"/>{bn ? '৩ পয়েন্ট নাও' : 'Steal 3'}</>}</button>
                      <button type="button" disabled={Boolean(busy)} onClick={() => giftPostAuthor(post)} className={secondaryButton}><Gift size={15} className="mr-1 inline"/>{bn ? 'পয়েন্ট উপহার' : 'Gift points'}</button>
                      <button onClick={() => openConversation(post.author.username)} className={secondaryButton}><MessageCircle size={15} className="mr-1 inline"/>{bn ? 'মেসেজ' : 'Message'}</button>
                    </>}
                    {post.author?.username === me?.username && <button disabled={Boolean(busy)} onClick={() => addPointsToPost(post)} className={secondaryButton}><Plus size={15} className="mr-1 inline"/>{bn ? 'পয়েন্ট যোগ' : 'Add points'}</button>}
                    <div className="relative ml-auto shrink-0">
                      <button type="button" aria-label="More post options" title="More options" onClick={() => setOpenPostMenu(openPostMenu === post.id ? null : post.id)} className={secondaryButton}><MoreHorizontal size={18}/></button>
                      {openPostMenu === post.id && <div className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl">
                        {post.author?.username === me?.username ? <>
                          <button onClick={() => { setOpenPostMenu(null); editOwnPost(post); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{bn ? 'পোস্ট সম্পাদনা' : 'Edit post'}</button>
                          <button onClick={() => { setOpenPostMenu(null); deletePost(post); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/10">{bn ? 'পোস্ট মুছুন' : 'Delete post'}</button>
                        </> : <button onClick={() => { setOpenPostMenu(null); setReportTarget({ type: "POST", id: post.id }); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{bn ? 'রিপোর্ট করুন' : 'Report post'}</button>}
                      </div>}
                    </div>
                  </div>
                  <form onSubmit={(event) => addComment(event, post.id)} className="mt-3 flex min-w-0 gap-2">
                    <input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((old) => ({ ...old, [post.id]: event.target.value }))} maxLength={1000} id={"comment-" + post.id} placeholder="Write a comment…" className={inputClass + " min-w-0 flex-1"}/>
                    <button disabled={busy === `comment:${post.id}`} className={secondaryButton}><Send size={15}/></button>
                  </form>
                </div>
              </article>)}
              {posts.length === 0 && <p className="py-8 text-center text-sm text-slate-500 md:col-span-2">No posts yet. Publish the first photo to start the arena.</p>}
            </div>
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Top players" subtitle="Overall point ranking" action={<button onClick={() => navTo('ranking')} className="text-sm font-semibold text-sky-300">View all <ChevronRight size={14} className="inline"/></button>}>
            <div className="space-y-3">{leaderboard.slice(0, 5).map((player) => <div key={player.id} className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${player.rank === 1 ? 'bg-amber-300 text-slate-950' : 'bg-white/5 text-slate-400'}`}>{player.rank}</span><Avatar user={player}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">@{player.username}</div><div className="text-xs text-slate-500">{player.displayName}</div></div><span className="text-sm font-bold text-amber-200">{fmt(player.points)}</span></div>)}</div>
          </Panel>
          <Panel title="Today's Champion" subtitle="Top net point movement today.">
            {dailyLeaderboard[0] ? <div className="flex items-center gap-3 rounded-xl bg-amber-300/10 p-4"><span className="text-3xl">👑</span><Avatar user={dailyLeaderboard[0]} size="lg"/><div className="min-w-0 flex-1"><div className="font-black text-white">@{dailyLeaderboard[0].username}</div><div className="text-xs text-slate-400">{dailyLeaderboard[0].displayName}</div></div><div className="text-right"><div className="font-black text-amber-200">+{fmt(dailyLeaderboard[0].periodPoints)}</div><div className="text-[10px] text-slate-500">today</div></div></div> : <p className="text-sm text-slate-500">No champion data yet.</p>}
          </Panel>
          <Panel title="Trending Now" subtitle="Posts with recent engagement and point activity.">
            <div className="space-y-3">{trending.slice(0,4).map((post) => <div key={post.id} className="flex items-center gap-3"><img src={post.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover"/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">@{post.author?.username}</div><div className="truncate text-xs text-slate-500">{post.caption || 'Photo post'}</div></div><div className="text-right"><div className="text-sm font-bold text-amber-200">{fmt(post.hotScore)}</div>{post.isHot && <span className="text-[10px] font-bold text-rose-300">🔥 HOT</span>}</div></div>)}{trending.length===0 && <p className="text-sm text-slate-500">No trending posts yet.</p>}</div>
          </Panel>
          <Panel title="Rising Users" subtitle="Newer players to discover.">
            <div className="space-y-3">{risingUsers.slice(0,5).map((player) => <div key={player.id} className="flex items-center gap-3"><Avatar user={player}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">@{player.username}</div><div className="truncate text-xs text-slate-500">{player.displayName}</div></div><span className="text-sm font-bold text-amber-200">{fmt(player.points)}</span><button onClick={() => toggleFollow(player.username)} className="text-xs font-semibold text-sky-300">Follow</button></div>)}</div>
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
          <div className="space-y-2">{leaderboard.map((player) => <div key={player.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-950/50 p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-sm font-black">{player.rank}</div><Avatar user={player}/><div className="min-w-0 flex-1"><button onClick={() => { setProfileUsername(player.username); setSection('profile'); navigate('/?section=profile&username=' + encodeURIComponent(player.username)); loadProfile(player.username); }} className="font-bold text-white">@{player.username}</button><div className="text-xs text-slate-500">{player.displayName}</div></div><div className="text-right"><div className="font-black text-amber-200">{fmt(player.points)} pts</div>{player.periodPoints !== undefined && <div className="text-xs text-slate-500">Period: {fmt(player.periodPoints)}</div>}</div>{player.username !== me?.username && <button disabled={Boolean(busy)} onClick={() => collectFromPlayer(player.username)} className={secondaryButton}>{busy === `steal-player:${player.username}` || busy === `steal:${player.username}` ? '…' : 'Steal 3'}</button>}</div>)}</div>
        </Panel>
      </div>}

      {section === 'wallet' && <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <Panel title="Point wallet" subtitle="Available balance and recent activity"><div className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-amber-300/10 p-5"><div className="text-sm text-slate-400">Available points</div><div className="mt-2 text-4xl font-black text-amber-100">{fmt(me?.points)}</div><div className="mt-3 text-xs text-slate-500">No cash-out is enabled.</div></div></Panel>
        <Panel title="Transaction history" subtitle="Latest 50 point movements"><div className="space-y-2">{transactions.map((tx) => <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${tx.direction === 'in' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>{tx.direction === 'in' ? '+' : '−'}</span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{tx.type.replaceAll('_',' ')}</div><div className="truncate text-xs text-slate-500">{tx.note || (tx.direction === 'in' ? 'Points received' : 'Points sent')}</div><div className="text-[11px] text-slate-600">{dateText(tx.createdAt)}</div></div><strong className={tx.direction === 'in' ? 'text-emerald-200' : 'text-rose-200'}>{tx.direction === 'in' ? '+' : '−'}{fmt(tx.amount)}</strong></div>)}{transactions.length === 0 && <p className="py-6 text-sm text-slate-500">No transactions yet.</p>}</div></Panel>
      </div>}

      {section === 'missions' && <div className="space-y-5">
        <Panel title="Daily missions" subtitle="Complete real actions to unlock point or shield rewards."><div className="grid gap-3 md:grid-cols-2">{missions.map((mission) => <div key={mission.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{mission.title}</h3><p className="mt-1 text-sm text-slate-400">{mission.description}</p></div><span className="text-sm font-black text-amber-200">{mission.rewardType === 'SHIELD' ? '🛡️ Shield' : `+${fmt(mission.reward)} pts`}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, mission.progress / mission.target * 100)}%` }}/></div><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{mission.progress}/{mission.target}</span><button disabled={!mission.completed || mission.claimed || Boolean(busy)} onClick={() => claimMission(mission.id)} className={mission.claimed ? 'text-emerald-300' : 'font-bold text-sky-300 disabled:text-slate-600'}>{mission.claimed ? 'Claimed ✓' : 'Claim reward'}</button></div></div>)}</div></Panel>
        <Panel title="Achievements" subtitle="Milestones are checked against your real activity."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{achievements.map((achievement) => <div key={achievement.id} className={`rounded-xl border p-4 ${achievement.unlocked ? 'border-amber-300/30 bg-amber-300/10' : 'border-white/10 bg-slate-950/40'}`}><div className="text-2xl">{achievement.unlocked ? '🏆' : '🔒'}</div><div className="mt-2 font-bold text-white">{achievement.title}</div><p className="mt-1 text-xs text-slate-400">{achievement.description}</p><div className="mt-3 text-xs text-slate-500">{fmt(achievement.current)} / {fmt(achievement.target)}</div></div>)}</div></Panel>
        <Panel title="Mystery reward" subtitle="Free daily reward; unlock it after a mission or skill game."><button disabled={busy === 'mystery'} onClick={openMystery} className={primaryButton}>{busy === 'mystery' ? 'Opening…' : '🎁 Open free reward'}</button></Panel>
      </div>}

      {section === 'battles' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Panel title="Community photo battles" subtitle="Vote once per battle. Voting closes after 10 minutes."><div className="space-y-4">{battles.map((battle) => <article key={battle.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="font-bold text-white">{battle.title}</div><span className="text-xs text-slate-500">{battle.status}</span></div><div className="grid grid-cols-2 gap-3">{[[battle.challenger,battle.challengerPost,'CHALLENGER'],[battle.opponent,battle.opponentPost,'OPPONENT']].map(([player,photo,choice]) => <div key={choice} className="overflow-hidden rounded-xl border border-white/10"><div className="p-2 text-xs font-semibold text-slate-300">@{player?.username || 'waiting'}</div>{photo?.imageUrl && <img src={photo.imageUrl} alt={photo.caption || 'Battle photo'} className="aspect-square w-full object-cover"/>}<div className="p-2 text-xs text-slate-400">{photo?.caption}</div><button disabled={battle.status !== 'OPEN' || Boolean(busy)} onClick={() => voteBattle(battle.id, choice)} className={secondaryButton + ' m-2'}>Vote for this photo</button></div>)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Votes: {battle.challengerVotes || 0} — {battle.opponentVotes || 0} · Reward: {fmt(battle.reward)} pts</span>{battle.status === 'OPEN' && battle.endsAt && new Date(battle.endsAt) <= new Date() && <button disabled={Boolean(busy)} onClick={() => finishBattle(battle.id)} className={secondaryButton}>{busy === `finish:${battle.id}` ? 'Finishing…' : 'Finish battle'}</button>}</div></article>)}{battles.length === 0 && <p className="py-6 text-sm text-slate-500">No battles yet. Start one using photos from both players.</p>}</div></Panel>
        <Panel title="Create a photo battle" subtitle="Choose one photo you own and one public photo from your opponent.">
          <form onSubmit={loadOpponentPosts} className="space-y-3"><label className="block text-xs text-slate-400">Opponent username<input value={opponentUsername} onChange={(e) => setOpponentUsername(e.target.value)} className={inputClass} placeholder="username"/></label><button className={secondaryButton}>Load battle photos</button></form>
          {myPosts.length > 0 && opponentPosts.length > 0 && <form onSubmit={createBattle} className="mt-4 space-y-3"><label className="block text-xs text-slate-400">Your photo<select value={myBattlePostId} onChange={(e) => setMyBattlePostId(e.target.value)} className={inputClass}>{myPosts.map((p) => <option key={p.id} value={p.id}>{p.caption || p.id}</option>)}</select></label><label className="block text-xs text-slate-400">Opponent photo<select value={opponentBattlePostId} onChange={(e) => setOpponentBattlePostId(e.target.value)} className={inputClass}>{opponentPosts.map((p) => <option key={p.id} value={p.id}>{p.caption || p.id}</option>)}</select></label><button disabled={busy === 'battle'} className={primaryButton}>Challenge to battle</button></form>}
        </Panel>
      </div>}

      {section === 'games' && <Panel title="Quick Tap" subtitle="Free 10-second reaction practice. A server-created session validates the maximum possible score."><div className="rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/10 p-5 text-center"><div className="text-xs font-bold uppercase tracking-widest text-sky-300">Time remaining</div><div className="my-3 text-5xl font-black text-white">{gameSession ? gameRemaining : '10'}s</div><div className="mb-4 text-sm text-slate-400">Score: {gameScore} taps · Max 100</div><button disabled={!gameSession || gameRemaining <= 0} onClick={tapGame} className="h-28 w-full rounded-2xl bg-sky-500 text-2xl font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">{gameSession ? 'TAP!' : 'Start a round first'}</button><button disabled={Boolean(busy) || Boolean(gameSession)} onClick={startGame} className={primaryButton + ' mt-4'}>{busy === 'game' ? 'Starting…' : 'Start 10-second game'}</button><p className="mt-3 text-xs text-slate-500">Up to five reward attempts per UTC day. Score is capped and validated server-side.</p></div></Panel>}

      {section === 'teams' && <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]"><Panel title="Create a team" subtitle="Build a team ranking with your friends."><form onSubmit={createTeam} className="space-y-3"><label className="block text-xs text-slate-400">Team name<input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={40} className={inputClass}/></label><label className="block text-xs text-slate-400">Description<textarea value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} maxLength={300} className={inputClass}/></label><button disabled={busy === 'team'} className={primaryButton}>Create team</button></form></Panel><Panel title="Team ranking" subtitle="Ranked by total points of current members."><div className="space-y-3">{teams.slice().sort((a,b) => b.totalPoints-a.totalPoints).map((team,i) => <div key={team.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 font-black">{i+1}</span><div className="min-w-0 flex-1"><div className="font-bold text-white">{team.name}</div><div className="text-xs text-slate-500">{team.memberCount} members · {fmt(team.totalPoints)} points</div><div className="text-xs text-slate-400">{team.description}</div></div>{team.creator?.username === me?.username ? <span className="text-xs font-bold text-sky-300">Creator</span> : <button disabled={Boolean(busy)} onClick={async () => { setBusy('team:' + team.id); try { const isMember = team.members?.some((member) => member.id === me?.id); await api.post(`/teams/${team.id}/${isMember ? 'leave' : 'join'}`); tell(isMember ? 'Left team.' : 'Joined team.'); await loadCore(); } catch (e) { tell(errText(e), 'error'); } finally { setBusy(''); } }} className={secondaryButton}>{team.members?.some((member) => member.id === me?.id) ? 'Leave' : 'Join'}</button>}</div>)}</div></Panel></div>}

      {section === 'referrals' && <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Panel title="Your referral link" subtitle="Copy and share it. The daily +30 share reward can be claimed once each day."><div className="break-all rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-sky-200">{referral?.referralUrl || `${window.location.origin}/register?ref=${encodeURIComponent(me?.username || '')}`}</div><div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={claimReferralShare} disabled={busy === 'referral'} className={primaryButton}>{busy === 'referral' ? 'Claiming…' : 'Copy link + claim 30 points'}</button><span className="text-sm text-slate-400">Successful referrals: {referral?.referralCount || 0}</span></div><p className="mt-3 text-xs text-slate-500">A new account can claim a referral once. The referrer receives +10,000 points when the referral is accepted.</p></Panel><Panel title="Referral safety" subtitle="Rewards are one-time per account."><ul className="space-y-2 text-sm text-slate-400"><li>• Self-referrals are rejected.</li><li>• Duplicate referral claims are rejected by a unique database constraint.</li><li>• Rewards are recorded in the point transaction history.</li></ul></Panel></div>}

      {section === 'messages' && <div className="grid w-full min-w-0 max-w-full min-h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] md:grid-cols-[300px_minmax(0,1fr)]">
<aside className="border-b border-white/10 p-3 md:border-b-0 md:border-r"><div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-bold text-white">Chats</h2><button className={secondaryButton} title="New message" onClick={() => { const name=window.prompt('Username to message:'); if(name) { const target=name.replace(/^@/,''); setMessageTarget(target); api.get('/messages/'+encodeURIComponent(target)).then(({data})=>setMessages(data)).catch(e=>tell(errText(e),'error')); } }}>✎</button></div>
<div className="relative mb-3"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={inboxSearch} onChange={e=>setInboxSearch(e.target.value)} placeholder="Search Messenger" className={inputClass+' pl-9'}/></div>
<div className="max-h-[58vh] space-y-1 overflow-y-auto">{inbox.filter(x=>((x.user?.displayName||'')+' '+(x.user?.username||'')).toLowerCase().includes(inboxSearch.toLowerCase())).map(x=><button key={x.user.id} onClick={async()=>{setMessageTarget(x.user.username);try{const {data}=await api.get('/messages/'+encodeURIComponent(x.user.username));setMessages(data);setInbox(old=>old.map(v=>v.user.id===x.user.id?{...v,unread:0}:v));}catch(e){tell(errText(e),'error')}}} className={'flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10 '+(messageTarget===x.user.username?'bg-sky-500/15':'')}><Avatar user={x.user}/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{x.user.displayName||x.user.username}</span><span className="block truncate text-xs text-slate-400">{x.lastMessage}</span></span>{x.unread>0&&<span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs text-white">{x.unread}</span>}</button>)}{inbox.length===0&&<p className="px-2 py-5 text-sm text-slate-500">No chats yet. Open a user's profile and tap Message.</p>}</div></aside>
<section className="flex min-h-[60vh] min-w-0 max-w-full flex-col">{messageTarget ? <><div className="flex items-center gap-3 border-b border-white/10 p-4"><Avatar user={inbox.find(x=>x.user?.username===messageTarget)?.user||{username:messageTarget}}/><div><div className="font-bold text-white">{inbox.find(x=>x.user?.username===messageTarget)?.user?.displayName||messageTarget}</div><div className="text-xs text-slate-400">@{messageTarget}</div></div></div>
<div className="flex-1 space-y-2 overflow-y-auto p-4">{messages.map(msg=><div key={msg.id} className={'flex min-w-0 max-w-full '+(msg.senderId===me?.id?'justify-end':'justify-start')}><div className={'w-fit min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-3 py-2 text-sm '+(msg.senderId===me?.id?'bg-sky-600 text-white':'bg-slate-800 text-slate-100')}><div style={{overflowWrap:"anywhere",wordBreak:"break-word",whiteSpace:"pre-wrap",maxWidth:"100%"}} className="block min-w-0">{msg.body}</div><div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70"><span>{dateText(msg.createdAt)}</span>{msg.senderId===me?.id&&<button type="button" title="Delete message" aria-label="Delete message" onClick={async()=>{if(!window.confirm("Delete this sent message?"))return;try{await api.delete("/messages/"+msg.id);setMessages(old=>old.filter(x=>x.id!==msg.id));loadInbox();}catch(e){tell(errText(e,"Could not delete message."),"error");}}} className="rounded p-1 hover:bg-white/10"><Trash2 size={13}/></button>}</div></div></div>)}{messages.length===0&&<p className="py-8 text-center text-sm text-slate-500">Say hello to start chatting.</p>}</div>
<form onSubmit={sendMessage} className="flex w-full min-w-0 gap-2 border-t border-white/10 p-3"><input value={messageText} onChange={e=>setMessageText(e.target.value)} maxLength={2000} placeholder="Aa" className={inputClass}/><button disabled={busy==='message'||!messageTarget} className={primaryButton} aria-label="Send message"><Send size={17}/></button></form></>:<div className="grid flex-1 place-items-center p-6 text-center"><div><MessageCircle size={42} className="mx-auto mb-3 text-slate-500"/><h3 className="font-bold text-white">Your messages</h3><p className="mt-1 text-sm text-slate-400">Choose a chat or start a new message.</p></div></div>}</section></div>}

      {section === 'privacy' && <div className="mx-auto w-full max-w-3xl space-y-4">
        <Panel title="Privacy settings" subtitle="Choose who can see your followers and following lists.">
        <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-5">
          <h2 className="font-bold text-white">Privacy settings</h2>
          <p className="mt-1 text-sm text-slate-400">Choose who can see your followers and following lists.</p>
          <form onSubmit={async (event) => {
            event.preventDefault();
            try {
              const { data } = await api.patch('/me/privacy', { followersVisibility, followingVisibility });
              setFollowersVisibility(data.followersVisibility);
              setFollowingVisibility(data.followingVisibility);
              setProfile((old) => old ? { ...old, ...data } : old);
              tell('Privacy settings saved.');
            } catch (e) { tell(errText(e, 'Could not save privacy settings.'), 'error'); }
          }} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">Who can see your followers
              <select value={followersVisibility} onChange={(e) => setFollowersVisibility(e.target.value)} className={inputClass}>
                <option value="PUBLIC">Everyone</option><option value="FOLLOWERS">Followers only</option><option value="PRIVATE">Only me</option>
              </select>
            </label>
            <label className="block text-sm text-slate-300">Who can see your following
              <select value={followingVisibility} onChange={(e) => setFollowingVisibility(e.target.value)} className={inputClass}>
                <option value="PUBLIC">Everyone</option><option value="FOLLOWERS">Followers only</option><option value="PRIVATE">Only me</option>
              </select>
            </label>
            <div className="sm:col-span-2"><button className={primaryButton}>Save privacy settings</button></div>
          </form>
        </section>

        </Panel>
      </div>}

      {section === 'notifications' && <Panel title="Notifications" subtitle="Point transfers, follows, battle invitations and system notices."><div className="space-y-2">{notifications.filter((n) => !/new message|sent you a message|message from @|sent a message/i.test(n.text || "")).map((n) => <div key={n.id} className={`flex items-start gap-3 rounded-xl p-3 ${n.readAt ? 'bg-slate-950/30' : 'bg-sky-500/10'}`}><Bell size={17} className="mt-1 shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><p className="text-sm text-slate-200">{n.text}</p><p className="mt-1 text-xs text-slate-500">{dateText(n.createdAt)}</p></div>{!n.readAt && <button onClick={() => markNotification(n)} className="text-xs font-semibold text-sky-300">{bn ? "পড়া হয়েছে" : "Mark read"}</button>}</div>)}{notifications.length === 0 && <p className="py-6 text-sm text-slate-500">No notifications yet.</p>}</div></Panel>}

      {section === 'profile' && <div className="mx-auto w-full max-w-5xl space-y-4">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-lg">
          <div className="relative z-0 h-36 overflow-hidden bg-gradient-to-r from-sky-700 via-indigo-600 to-violet-700 sm:h-52">
            {(profileUsername === me?.username ? me?.coverUrl : profile?.coverUrl) && <img src={profileUsername === me?.username ? me.coverUrl : profile.coverUrl} alt="Cover photo" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            {profileUsername === me?.username && <button type="button" onClick={() => coverPickerRef.current?.click()} className="absolute bottom-3 right-3 z-30 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white"><Camera size={14} className="mr-1 inline"/> Edit cover photo</button>}
            {profileUsername === me?.username && <input ref={coverPickerRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async (event) => { const file=event.target.files?.[0]; if(!file)return; if(file.size>5*1024*1024){tell('Cover photo must be 5 MB or smaller.','error');event.target.value='';return;} try {setBusy('cover-upload');const fd=new FormData();fd.append('file',file);const uploaded=await api.post('/media/upload',fd);const {data}=await api.patch('/me/profile',{coverUrl:uploaded.data.url});setMe(data);setUser(data);setProfile(data);setCoverUrl(data.coverUrl||uploaded.data.url);tell('Cover photo updated.');}catch(err){tell(errText(err,'Could not upload cover photo. Check that image storage is configured on the server.'),'error');}finally{setBusy('');event.target.value='';}}}/>}
          </div>
          <div className="px-4 pb-4 sm:px-7">
            <div className="relative z-10 -mt-10 flex flex-col gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-3">
                <div className="relative z-20 shrink-0 rounded-full border-4 border-white bg-white shadow-xl dark:border-slate-900">
                  {((profileUsername === me?.username ? me : profile)?.avatarUrl) ? <img src={(profileUsername === me?.username ? me : profile).avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover sm:h-32 sm:w-32"/> : <div className="grid h-24 w-24 place-items-center rounded-full bg-sky-500 text-3xl font-black text-white sm:h-32 sm:w-32">{((profileUsername === me?.username ? me?.displayName : profile?.displayName) || profileUsername || 'U').slice(0,1).toUpperCase()}</div>}
                </div>
                <div className="min-w-0 pb-1">
                  <h1 className="break-words text-2xl font-extrabold text-white sm:text-3xl">{(profileUsername === me?.username ? me?.displayName : profile?.displayName) || profileUsername || me?.displayName || 'Your profile'}</h1>
                  <p className="break-words text-sm text-slate-400">@{profileUsername || me?.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pb-1">
                {profileUsername === me?.username ? <button type="button" onClick={() => setProfileEditOpen(true)} className={primaryButton}><Camera size={15} className="mr-1 inline"/> Edit profile</button> : <><button type="button" disabled={busy === `follow:${profileUsername}`} onClick={() => toggleFollow(profileUsername)} className={primaryButton}>{followingUsers.includes(profileUsername) ? 'Following · Unfollow' : 'Follow'}</button><button type="button" onClick={() => openConversation(profileUsername)} className={secondaryButton}><MessageCircle size={15} className="mr-1 inline"/> Message</button><button type="button" onClick={() => setReportTarget({type:'USER',id:profile?.id})} className={secondaryButton}>Report</button></>}
              </div>
            </div>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm text-slate-300">{(profileUsername === me?.username ? me?.bio : profile?.bio) || 'No bio added yet.'}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-sm text-slate-400">
              <button type="button" onClick={() => document.getElementById('profile-posts-section')?.scrollIntoView({behavior:'smooth',block:'start'})} className="rounded-lg px-1 py-1 text-left hover:bg-white/10"><strong className="text-white">{fmt((profileUsername === me?.username ? posts.filter(p=>p.author?.username===me?.username).length : profile?.postCount) || 0)}</strong> Posts</button>
              <button type="button" onClick={() => openProfileList('followers')} className="rounded-lg px-1 py-1 text-left hover:bg-white/10"><strong className="text-white">{fmt(profile?.followers || 0)}</strong> Followers</button>
              <button type="button" onClick={() => openProfileList('following')} className="rounded-lg px-1 py-1 text-left hover:bg-white/10"><strong className="text-white">{fmt(profile?.following || 0)}</strong> Following</button>
              <span className="rounded-lg px-1 py-1"><strong className="text-amber-300">{fmt((profileUsername === me?.username ? me?.points : profile?.points) || 0)}</strong> Points</span>
            </div>
          </div>
        </section>

        <section id="profile-posts-section" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-extrabold text-white">{profileUsername === me?.username ? 'Your posts' : 'Posts'}</h2>
            {profileUsername === me?.username && <button type="button" onClick={() => {setSection('home');setComposeOpen(true);}} className={primaryButton}><Plus size={15} className="mr-1 inline"/> Create post</button>}
          </div>
          <div className="space-y-4 p-3 sm:p-5">
            {(profileUsername === me?.username ? posts.filter(p=>p.author?.username===me?.username) : profilePosts).map(post => <article key={post.id} className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="flex items-center gap-3 p-4">
                <Avatar user={post.author || (profileUsername === me?.username ? me : profile)} />
                <div className="min-w-0 flex-1"><div className="break-words font-bold text-white">{post.author?.displayName || post.author?.username || profile?.displayName || me?.displayName}</div><div className="text-xs text-slate-400">@{post.author?.username || profileUsername || me?.username} · {dateText(post.createdAt)}</div></div>
                {post.author?.username === me?.username && <button type="button" onClick={() => deletePost(post)} className="rounded-full p-2 text-slate-400 hover:bg-white/10" aria-label="Delete post"><Trash2 size={17}/></button>}
              </div>
              {post.caption && <p className="whitespace-pre-wrap break-words px-4 pb-3 text-sm text-slate-200">{post.caption}</p>}
              {post.imageUrl && <button type="button" onClick={()=>setExpandedMedia({url:post.imageUrl,caption:post.caption||'',author:post.author?.username||profileUsername||''})} className="block w-full cursor-zoom-in bg-black/10"><img src={post.imageUrl} alt="Open post photo" className="max-h-[620px] w-full object-contain"/></button>}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><span className="text-amber-300">⚡ {fmt(post.points)} points</span><span className="text-slate-400">♥ {fmt(post._count?.likes)} likes · 💬 {fmt(post._count?.comments)} comments</span></div>
              {post.author?.username === me?.username && <div className="px-4 pb-3"><button type="button" disabled={busy === 'invest:' + post.id} onClick={() => addPointsToPost(post)} className={secondaryButton + ' w-full sm:w-auto'}><Zap size={15} className="mr-1 inline"/> Add points to this post</button></div>}
              <div className="grid grid-cols-3 border-y border-white/10 px-2 py-1">
                <button type="button" disabled={Boolean(busy)} onClick={()=>likePost(post.id)} className="rounded-lg py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10"><Heart size={16} className="mr-1 inline"/> Like</button>
                <button type="button" onClick={()=>document.getElementById('profile-comment-'+post.id)?.focus()} className="rounded-lg py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10"><MessageCircle size={16} className="mr-1 inline"/> Comment</button>
                <button type="button" onClick={()=>sharePost(post)} className="rounded-lg py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10"><Share2 size={16} className="mr-1 inline"/> Share</button>
              </div>
              {post.author?.username !== me?.username && <div className="flex flex-wrap gap-2 px-4 pt-3"><button type="button" disabled={busy===`steal:${post.id}`||(stealCountdowns[post.id]||0)>0} onClick={()=>collectPoints(post)} className={secondaryButton}>{(stealCountdowns[post.id]||0)>0?`Steal in ${stealCountdowns[post.id]}s`:'Steal 3'}</button><button type="button" onClick={()=>giftPostAuthor(post)} className={secondaryButton}><Gift size={14} className="mr-1 inline"/> Gift points</button><button type="button" onClick={()=>openConversation(post.author.username)} className={secondaryButton}>Message</button></div>}
              <form onSubmit={event=>addComment(event,post.id)} className="flex min-w-0 gap-2 p-4"><input id={'profile-comment-'+post.id} value={commentDrafts[post.id]||''} onChange={event=>setCommentDrafts(old=>({...old,[post.id]:event.target.value}))} maxLength={1000} placeholder="Write a comment…" className={inputClass+' min-w-0 flex-1'}/><button disabled={busy===`comment:${post.id}`} className={secondaryButton} aria-label="Send comment"><Send size={15}/></button></form>
            </article>)}
            {(profileUsername === me?.username ? posts.filter(p=>p.author?.username===me?.username) : profilePosts).length === 0 && <div className="py-12 text-center"><ImagePlus size={38} className="mx-auto mb-3 text-slate-400"/><h3 className="font-bold text-white">No posts yet</h3><p className="mt-1 text-sm text-slate-400">Photos and updates will appear here.</p>{profileUsername === me?.username && <button type="button" onClick={()=>{setSection('home');setComposeOpen(true);}} className={primaryButton+' mt-4'}>Create your first post</button>}</div>}
          </div>
        </section>
      </div>}

      {section === 'search' && <Panel title="Find players" subtitle="Search by username or display name."><form onSubmit={findUsers} className="mb-4 flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search username…" className={inputClass}/><button className={primaryButton}><Search size={16}/></button></form><div className="space-y-2">{users.map((player) => <div key={player.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><Avatar user={player}/><div className="min-w-0 flex-1"><button onClick={() => { setProfileUsername(player.username); loadProfile(player.username); setSection('profile'); }} className="font-bold text-white">@{player.username}</button><div className="text-xs text-slate-500">{player.displayName} · {fmt(player.points)} points</div></div>{player.username !== me?.username && <button disabled={busy === `follow:${player.username}`} onClick={() => toggleFollow(player.username)} className={secondaryButton}>{followingUsers.includes(player.username) ? 'Following · Unfollow' : 'Follow'}</button>}</div>)}</div></Panel>}

      {section === 'admin' && me?.role === 'ADMIN' && <div className="space-y-5">
        <Panel title="Admin point adjustment" subtitle="Every adjustment is recorded in the audit log."><form onSubmit={adjustPoints} className="grid gap-3 md:grid-cols-4"><input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="Username" className={inputClass}/><input type="number" step="1" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} className={inputClass}/><input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className={inputClass}/><button disabled={busy === 'admin-points'} className={primaryButton}>Adjust points</button></form></Panel>
        <Panel title="User moderation" subtitle="Suspend, ban, or reactivate accounts."><div className="space-y-2">{adminUsers.map((player) => <div key={player.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-950/50 p-3"><div className="min-w-0 flex-1"><div className="font-bold text-white">@{player.username}</div><div className="text-xs text-slate-500">{player.status} · {fmt(player.points)} points</div></div><button onClick={() => changeStatus(player.username, player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')} className={secondaryButton}>{player.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button><button onClick={() => changeStatus(player.username, 'BANNED')} className={secondaryButton}>Ban</button></div>)}</div></Panel>
        <Panel title="Post moderation" subtitle="Hide or restore community photos."><div className="space-y-2">{adminPosts.map((post) => <div key={post.id} className="flex items-center gap-3 rounded-xl bg-slate-950/50 p-3"><div className="min-w-0 flex-1"><div className="font-bold text-white">{post.author?.username}</div><div className="truncate text-xs text-slate-500">{post.caption}</div></div><button onClick={() => moderatePost(post.id, !post.hidden)} className={secondaryButton}>{post.hidden ? 'Restore' : 'Hide'}</button></div>)}</div></Panel>
        <Panel title="Reports" subtitle="Review user-submitted reports."><div className="space-y-2">{reports.map((report) => <div key={report.id} className="rounded-xl bg-slate-950/50 p-3"><div className="font-bold text-white">{report.category} · {report.targetType}</div><div className="text-xs text-slate-500">{report.details || report.targetId}</div><div className="mt-2 flex gap-2">{['REVIEWING','RESOLVED','DISMISSED'].map((status) => <button key={status} onClick={() => updateReport(report.id,status)} className={secondaryButton}>{status}</button>)}</div></div>)}</div></Panel>
        <Panel title="Global notification" subtitle="Send an announcement to all active users."><form onSubmit={sendGlobalNotice} className="space-y-3"><textarea value={globalText} onChange={(e) => setGlobalText(e.target.value)} maxLength={500} className={inputClass} placeholder="Announcement…"/><button className={primaryButton}>Send notification</button></form></Panel>
        <Panel title="Latest audit logs" subtitle="Administrative changes"><div className="space-y-2">{auditLogs.map((log) => <div key={log.id} className="rounded-lg bg-slate-950/50 p-3 text-sm"><strong>{log.action}</strong> · {log.actor?.username} · {log.details}<div className="text-xs text-slate-500">{dateText(log.createdAt)}</div></div>)}</div></Panel>
        <Panel title="Recent transactions" subtitle="Latest 200 point movements"><div className="space-y-2">{adminTransactions.map((tx) => <div key={tx.id} className="rounded-lg bg-slate-950/50 p-3 text-sm">{tx.type} · {fmt(tx.amount)} · @{tx.sender?.username || 'system'} → @{tx.receiver?.username || '—'}<div className="text-xs text-slate-500">{dateText(tx.createdAt)}</div></div>)}</div></Panel>
      </div>}

      {profileEditOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-3" onClick={() => setProfileEditOpen(false)}>
        <section role="dialog" aria-modal="true" onClick={event => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-white">Edit profile</h2><button type="button" onClick={() => setProfileEditOpen(false)} className={secondaryButton}><X size={18}/></button></div>
          <form onSubmit={async event => {
            event.preventDefault(); setBusy('profile-save');
            try {
              let nextAvatar = avatarUrl.trim(); let nextCover = coverUrl.trim();
              if (avatarFile) { if (avatarFile.size > 5*1024*1024) throw new Error('Profile picture must be 5 MB or smaller.'); const fd = new FormData(); fd.append('file', avatarFile); const upload = await api.post('/media/upload', fd); nextAvatar = upload.data.url; }
              if (coverFile) { if (coverFile.size > 5*1024*1024) throw new Error('Cover photo must be 5 MB or smaller.'); const fd = new FormData(); fd.append('file', coverFile); const upload = await api.post('/media/upload', fd); nextCover = upload.data.url; }
              const {data} = await api.patch('/me/profile', {displayName:displayName.trim(), bio:bio.trim(), avatarUrl:nextAvatar, coverUrl:nextCover});
              setMe(data); setUser(data); setProfile(data); setAvatarUrl(data.avatarUrl||''); setCoverUrl(data.coverUrl||''); setAvatarFile(null); setCoverFile(null); setProfileEditOpen(false); tell('Profile updated successfully.');
            } catch(e) { tell(errText(e, 'Could not save profile. Check image storage configuration.'), 'error'); } finally { setBusy(''); }
          }} className="grid gap-4">
            <label className="text-sm text-slate-300">Display name<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={60} className={inputClass}/></label>
            <label className="text-sm text-slate-300">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={3} className={inputClass}/></label>
            <label className="text-sm text-slate-300">Profile picture<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setAvatarFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs text-slate-300"/></label>
            <label className="text-sm text-slate-300">Cover photo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setCoverFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs text-slate-300"/></label>
            <label className="text-sm text-slate-300">Profile picture URL (optional)<input type="url" value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://…" className={inputClass}/></label>
            <label className="text-sm text-slate-300">Cover photo URL (optional)<input type="url" value={coverUrl} onChange={e=>setCoverUrl(e.target.value)} placeholder="https://…" className={inputClass}/></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={()=>setProfileEditOpen(false)} className={secondaryButton}>Cancel</button><button disabled={busy==='profile-save'} className={primaryButton}>{busy==='profile-save'?'Saving…':'Save changes'}</button></div>
          </form>
        </section>
      </div>}

      {profileListModal && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={() => setProfileListModal('')}>
        <section role="dialog" aria-modal="true" aria-label={profileListModal === 'followers' ? 'Followers' : 'Following'} onClick={event => event.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><h2 className="font-bold text-white">{profileListModal === 'followers' ? 'Followers' : 'Following'}</h2><button type="button" onClick={() => setProfileListModal('')} className="rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Close"><X size={18}/></button></div>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">
            {profileListLoading ? <p className="p-5 text-center text-sm text-slate-400">Loading…</p> : profileListUsers.map((person, index) => <div key={person.id || person.username || index} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/5"><Avatar user={{...person, displayName:person.displayName || person.full_name, avatarUrl:person.avatarUrl || person.profile_picture}}/><div className="min-w-0 flex-1"><div className="break-words font-semibold text-white">{person.displayName || person.full_name || person.username}</div><div className="text-xs text-slate-400">@{person.username}</div></div>{person.username && person.username !== me?.username && <button type="button" onClick={() => { setProfileListModal(''); setProfileUsername(person.username); setSection('profile'); navigate('/?section=profile&username=' + encodeURIComponent(person.username)); loadProfile(person.username); }} className={secondaryButton}>View profile</button>}</div>)}
            {!profileListLoading && profileListUsers.length === 0 && <p className="p-5 text-center text-sm text-slate-400">No {profileListModal} to show yet.</p>}
          </div>
        </section>
      </div>}

      {reportTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><form onSubmit={submitReport} className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5"><h2 className="text-xl font-bold text-white">Report content</h2><select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className={inputClass}>{['SPAM','HARASSMENT','FAKE_ACCOUNT','ILLEGAL_CONTENT','COPYRIGHT','ABUSE','OTHER'].map((value) => <option key={value}>{value}</option>)}</select><textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} maxLength={1000} placeholder="Details (optional)" className={inputClass}/><div className="flex gap-2"><button type="button" onClick={() => setReportTarget(null)} className={secondaryButton}>Cancel</button><button disabled={busy === 'report'} className={primaryButton}>Submit report</button></div></form></div>}
      </main>
      <aside className="hidden space-y-4 lg:block">
        <section className="sticky top-24 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="mb-3 font-bold text-white">Quick guide</h2><p className="text-sm leading-6 text-slate-400">Share a photo, follow people, like and comment on posts, or open Messages to chat privately.</p><button onClick={() => navTo('search')} className="mt-4 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white">Find people</button><button onClick={() => navTo('messages')} className="mt-2 w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white">Open messages</button></section>
      </aside>
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/95 px-1 py-2 backdrop-blur lg:hidden"><nav className="mx-auto flex max-w-xl items-center justify-around gap-1">
        {menu.filter(([key]) => ['home','search','messages','notifications','profile'].includes(key)).map(([key,label,Icon]) => <button key={key} onClick={() => navTo(key)} className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold ${section === key ? 'text-sky-300' : 'text-slate-400'}`}><Icon size={21}/><span>{label === 'Find Players' ? 'Search' : label === 'Notifications' ? 'Alerts' : label}</span>{key === 'notifications' && unreadCount > 0 && <span className="absolute right-4 top-0 h-2 w-2 rounded-full bg-rose-500"/>}{key === 'messages' && unreadMessagesCount > 0 && <span className="absolute right-4 top-0 h-2 w-2 rounded-full bg-sky-500"/>}</button>)}
      </nav></aside>
    </div>
  </div>;
}

export default SocialGamingApp;
