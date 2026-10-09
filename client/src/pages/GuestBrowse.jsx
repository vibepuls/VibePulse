import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Heart, MessageCircle, Trophy, UserRound, LogIn, UserPlus, RefreshCw } from 'lucide-react';
import api from '../services/api';

const fmt = (value) => new Intl.NumberFormat().format(Number(value || 0));

function GuestBrowse() {
  const [posts, setPosts] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPublicContent = async () => {
    setLoading(true);
    setError('');
    const [postResult, rankResult] = await Promise.allSettled([
      api.get('/posts?page=1'),
      api.get('/leaderboard')
    ]);
    if (postResult.status === 'fulfilled') setPosts(Array.isArray(postResult.value.data) ? postResult.value.data : []);
    else setError('Public posts could not be loaded. Please try again.');
    if (rankResult.status === 'fulfilled') setRanking(Array.isArray(rankResult.value.data) ? rankResult.value.data.slice(0, 10) : []);
    setLoading(false);
  };

  useEffect(() => { loadPublicContent(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight"><Activity className="text-sky-500" /> VibePulse</Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10"><LogIn size={16}/> Sign in</Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-300"><UserPlus size={16}/> Create account</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-3 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">Home</h2><p className="mt-1 text-sm text-slate-400">See what people are sharing on VibePulse.</p></div>
            <button onClick={loadPublicContent} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"><RefreshCw size={15}/> Refresh</button>
          </div>
          {loading && <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-300">Loading public posts…</div>}
          {!loading && error && <div role="alert" className="rounded-xl border border-rose-400/30 p-4 text-rose-200">{error}</div>}
          {!loading && !error && posts.length === 0 && <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-300">No public posts yet. Be one of the first to join!</div>}
          <div className="space-y-5">
            {posts.map((post) => (
              <article key={post.id} className="overflow-hidden border-b border-white/10 bg-black">
                <div className="flex items-center justify-between gap-3 p-4">
                  <Link to={post.author?.username ? `/profile/${encodeURIComponent(post.author.username)}` : '/register'} className="flex min-w-0 items-center gap-3 hover:opacity-80">
                    {post.author?.avatarUrl ? <img src={post.author.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover"/> : <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-sky-500"><UserRound size={19}/></span>}
                    <span className="min-w-0"><span className="block truncate font-bold">{post.author?.displayName || post.author?.username || 'VibePulse user'}</span><span className="block truncate text-sm text-slate-400">@{post.author?.username || 'user'}</span></span>
                  </Link>
                  <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-bold text-amber-200"><Trophy size={13} className="mr-1 inline"/> {fmt(post.points)} points</span>
                </div>
                {post.imageUrl && <img src={post.imageUrl} alt={post.caption || 'Public post'} loading="lazy" className="mt-2 max-h-[650px] w-full rounded-2xl border border-white/10 bg-black object-contain"/>}
                {post.caption && <p className="whitespace-pre-wrap break-words px-4 py-4 text-slate-100">{post.caption}</p>}
                <div className="flex items-center gap-5 border-t border-white/10 px-4 py-3 text-sm text-slate-400">
                  <span><Heart size={16} className="mr-1 inline"/> {fmt(post._count?.likes)} likes</span>
                  <span><MessageCircle size={16} className="mr-1 inline"/> {fmt(post._count?.comments)} comments</span>
                  <Link to="/register" className="ml-auto font-semibold text-sky-300 hover:text-sky-200">Join to interact →</Link>
                </div>
              </article>
            ))}
          </div>
          {!loading && posts.length > 0 && <div className="mt-5 rounded-2xl border border-dashed border-white/20 p-5 text-center"><p className="font-semibold">That’s the latest public feed preview.</p><p className="mt-1 text-sm text-slate-400">Create an account to join the community and take part.</p><Link to="/register" className="mt-3 inline-block rounded-xl bg-sky-500 px-4 py-2 font-bold text-slate-950">Create account</Link></div>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Trophy className="text-amber-300" size={19}/> Top players</h2>
            <p className="mb-4 text-sm text-slate-400">Overall point ranking</p>
            {ranking.length === 0 && <p className="text-sm text-slate-400">Ranking is not available right now.</p>}
            <ol className="space-y-3">
              {ranking.map((player, index) => <li key={player.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-black text-amber-200">{player.rank || index + 1}</span>
                {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover"/> : <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><UserRound size={16}/></span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{player.displayName || player.username}</span><span className="block truncate text-xs text-slate-400">@{player.username}</span></span>
                <span className="text-sm font-bold text-sky-200">{fmt(player.points)}</span>
              </li>)}
            </ol>
            <Link to="/register" className="mt-4 block rounded-xl border border-white/15 px-3 py-2 text-center text-sm font-semibold hover:bg-white/10">Join the rankings</Link>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <h2 className="font-bold">What needs an account?</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>• Publish photos and captions</li><li>• Like and comment on posts</li><li>• Follow players and message them</li><li>• Gift or steal points where allowed</li><li>• Join battles, missions, and games</li>
            </ul>
            <Link to="/register" className="mt-4 block rounded-xl bg-sky-500 px-4 py-3 text-center font-bold text-white hover:bg-sky-400">Create your free account</Link>
          </section>
        </aside>
      </div>
      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-slate-500">VibePulse · Public content is viewable without signing in.</footer>
    </main>
  );
}

export default GuestBrowse;
