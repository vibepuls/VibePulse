import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
  ArrowDownRight,
  Crown,
  Gift,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

const formatPoints = (value) => new Intl.NumberFormat().format(Number(value || 0));
const initials = (name = 'U') => name.trim().slice(0, 1).toUpperCase() || 'U';
const getError = (error, fallback) => error?.response?.data?.error || error?.message || fallback;

function Avatar({ user, size = 'md' }) {
  const dimensions = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${dimensions} rounded-full object-cover ring-2 ring-white/10`} />;
  }
  return (
    <div className={`${dimensions} grid place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-black text-white ring-2 ring-white/10`}>
      {initials(user?.displayName || user?.username)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">{label}</span>
        <Icon size={18} className="text-violet-300" />
      </div>
      <div className="text-2xl font-black tracking-tight text-white">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

function ReactionPractice() {
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(10);
  const [taps, setTaps] = useState(0);
  const [best, setBest] = useState(0);
  const tapsRef = useRef(0);

  useEffect(() => {
    tapsRef.current = taps;
  }, [taps]);

  useEffect(() => {
    if (!active) return undefined;
    const interval = window.setInterval(() => {
      setRemaining((time) => {
        if (time <= 1) {
          window.clearInterval(interval);
          setActive(false);
          setBest((previous) => Math.max(previous, tapsRef.current));
          return 0;
        }
        return time - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [active]);

  const start = () => {
    tapsRef.current = 0;
    setTaps(0);
    setRemaining(10);
    setActive(true);
  };

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-cyan-500/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
            <Target size={16} /> Skill practice
          </div>
          <h3 className="mt-2 text-xl font-bold text-white">10-second tap test</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Practice your focus. This is a free skill game: no entry fee, wagers, or random prizes.
          </p>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
          <div className="text-2xl font-black text-white">{remaining}s</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">left</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => active && setTaps((count) => count + 1)}
        disabled={!active}
        className="mt-5 flex min-h-24 w-full items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 text-center transition enabled:active:scale-[0.99] enabled:hover:border-violet-300/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>
          <span className="block text-2xl font-black text-white">{active ? 'TAP!' : 'Ready when you are'}</span>
          <span className="mt-1 block text-sm text-slate-400">{active ? 'Tap here as many times as you can' : 'Start a practice round below'}</span>
        </span>
      </button>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-300">
          Taps: <strong className="text-white">{taps}</strong>
          <span className="mx-2 text-slate-600">•</span>
          Best: <strong className="text-white">{best}</strong>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={active}
          className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {active ? 'Practice in progress…' : remaining === 0 ? 'Try again' : 'Start practice'}
        </button>
      </div>
    </section>
  );
}

export default function PointWars() {
  const [me, setMe] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUser, setBusyUser] = useState('');
  const [giftUsername, setGiftUsername] = useState('');
  const [giftAmount, setGiftAmount] = useState('10');
  const [message, setMessage] = useState(null);

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/me'),
        api.get('/leaderboard'),
        api.get('/posts?page=1'),
      ]);
      if (results[0].status === 'fulfilled') setMe(results[0].value.data);
      if (results[1].status === 'fulfilled') setLeaderboard(results[1].value.data || []);
      if (results[2].status === 'fulfilled') setPosts(results[2].value.data || []);
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length === results.length) {
        setMessage({ type: 'error', text: getError(failures[0].reason, 'Could not load the arena. Please try again.') });
      } else if (failures.length) {
        setMessage({ type: 'error', text: 'Some arena information could not load. Use refresh to try again.' });
      } else {
        setMessage(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runSteal = async (username) => {
    if (!username || username === me?.username) return;
    setBusyUser(username);
    setMessage(null);
    try {
      const { data } = await api.post(`/points/steal/${encodeURIComponent(username)}`);
      setMessage({ type: 'success', text: `You collected ${formatPoints(data.stolen)} points from @${username}. The server enforces the 4-second cooldown.` });
      await loadData(true);
    } catch (error) {
      setMessage({ type: 'error', text: getError(error, 'Point action failed.') });
    } finally {
      setBusyUser('');
    }
  };

  const sendGift = async (event) => {
    event.preventDefault();
    const amount = Number(giftAmount);
    if (!giftUsername.trim() || !Number.isInteger(amount) || amount < 1) {
      setMessage({ type: 'error', text: 'Enter a username and a whole-number gift amount.' });
      return;
    }
    setBusyUser('gift');
    setMessage(null);
    try {
      await api.post('/points/gift', { username: giftUsername.trim(), amount });
      setMessage({ type: 'success', text: `Gift sent to @${giftUsername.trim()}.` });
      setGiftUsername('');
      await loadData(true);
    } catch (error) {
      setMessage({ type: 'error', text: getError(error, 'Could not send the gift.') });
    } finally {
      setBusyUser('');
    }
  };

  const myRank = leaderboard.find((user) => user.username === me?.username)?.rank
    || (leaderboard.findIndex((user) => user.username === me?.username) + 1 || '—');

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-slate-300">
        <div className="flex items-center gap-3"><Loader2 className="animate-spin" /> Loading your arena…</div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-violet-300">
            <Sparkles size={16} /> VibePulse Arena
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Play fair. Build your rank.</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Share photos, climb the leaderboard, and send points to friends. Skill challenges are free—your balance is never used as a stake.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {message && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-200'}`}>
          {message.text}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Zap} label="Your points" value={formatPoints(me?.points)} detail="Server-verified balance" />
        <StatCard icon={Trophy} label="Leaderboard rank" value={typeof myRank === 'number' ? `#${myRank}` : myRank} detail="Among active members" />
        <StatCard icon={Crown} label="Top score" value={formatPoints(leaderboard[0]?.points)} detail={leaderboard[0] ? `@${leaderboard[0].username}` : 'No rankings yet'} />
        <StatCard icon={Target} label="Photo posts" value={formatPoints(posts.length)} detail="Latest page loaded" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <ReactionPractice />

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Photo feed</h2>
                <p className="mt-1 text-sm text-slate-400">Recent community posts from the live API.</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{posts.length} loaded</span>
            </div>
            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                No public posts yet. Share a photo to start the feed.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {posts.slice(0, 6).map((post) => (
                  <article key={post.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt={post.caption || 'Community photo'} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={post.author} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{post.author?.displayName || post.author?.username || 'Community member'}</div>
                          <div className="text-xs text-slate-500">@{post.author?.username || 'member'}</div>
                        </div>
                        <div className="ml-auto flex items-center gap-1 text-xs font-bold text-amber-200"><Zap size={13} /> {formatPoints(post.points)}</div>
                      </div>
                      {post.caption && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-300">{post.caption}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-2"><Trophy size={18} className="text-amber-300" /><h2 className="text-xl font-bold text-white">Leaderboard</h2></div>
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((user, index) => (
                <div key={user.id || user.username} className="flex items-center gap-3 rounded-xl bg-slate-950/40 p-3">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${index === 0 ? 'bg-amber-300 text-slate-950' : index === 1 ? 'bg-slate-300 text-slate-950' : index === 2 ? 'bg-orange-300 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                    {user.rank || index + 1}
                  </div>
                  <Avatar user={user} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{user.displayName || user.username}</div>
                    <div className="truncate text-xs text-slate-500">@{user.username}</div>
                  </div>
                  <div className="text-right text-sm font-bold text-amber-200">{formatPoints(user.points)}</div>
                  {user.username !== me?.username && (
                    <button
                      type="button"
                      title={`Collect 3 points from @${user.username}`}
                      onClick={() => runSteal(user.username)}
                      disabled={Boolean(busyUser) || Number(user.points) < 3}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyUser === user.username ? <Loader2 size={15} className="animate-spin" /> : <ArrowDownRight size={16} />}
                    </button>
                  )}
                </div>
              ))}
              {leaderboard.length === 0 && <p className="py-5 text-center text-sm text-slate-500">Leaderboard is empty.</p>}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Point collection is limited by the server's cooldown and balance checks. Only collect points from members with enough balance.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-2"><Gift size={18} className="text-pink-300" /><h2 className="text-xl font-bold text-white">Send a gift</h2></div>
            <p className="mb-4 text-sm text-slate-400">Share some of your existing points with a friend.</p>
            <form onSubmit={sendGift} className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Friend username
                <input value={giftUsername} onChange={(event) => setGiftUsername(event.target.value)} maxLength={24} autoComplete="off" placeholder="e.g. nadia" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Amount
                <input type="number" min="1" max="1000000" step="1" value={giftAmount} onChange={(event) => setGiftAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none focus:border-violet-400/60" />
              </label>
              <div className="text-xs text-slate-500">Your balance: {formatPoints(me?.points)} points</div>
              <button type="submit" disabled={busyUser === 'gift'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-pink-400 disabled:opacity-60">
                {busyUser === 'gift' ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Send points
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-200"><ShieldCheckIcon /> Fair-play rules</div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>• No entry fees or point wagers for games.</li>
              <li>• Skill practice does not alter your points balance.</li>
              <li>• Gifts and point actions are validated by the server.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ShieldCheckIcon() {
  return <span aria-hidden="true" className="inline-grid h-5 w-5 place-items-center rounded-full border border-emerald-300/40 text-[11px]">✓</span>;
}
