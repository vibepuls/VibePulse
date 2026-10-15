import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, CalendarDays, Heart, MessageCircle, Trophy, UserRound } from 'lucide-react';
import api from '../services/api';

const number = (value) => new Intl.NumberFormat().format(Number(value || 0));
export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setMissing(false);
    Promise.all([
      api.get(`/users/${encodeURIComponent(username)}/profile`),
      api.get(`/users/${encodeURIComponent(username)}/posts`)
    ]).then(([profileResponse, postsResponse]) => {
      if (!active) return;
      setProfile(profileResponse.data);
      setPosts(Array.isArray(postsResponse.data) ? postsResponse.data : []);
    }).catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username]);
  return <main className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-white/10"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
      <Link to="/" className="flex items-center gap-2 text-xl font-black"><Activity className="text-sky-400" /> VibePulse</Link>
      <div className="flex gap-2"><Link to="/login" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Sign in</Link><Link to="/register" className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950">Join</Link></div>
    </div></header>
    <div className="mx-auto max-w-3xl px-4 py-6">
      {loading && <p className="py-12 text-center text-slate-400">Loading public profile…</p>}
      {!loading && missing && <section className="rounded-2xl border border-white/10 p-8 text-center"><h1 className="text-2xl font-bold">Profile not found</h1><p className="mt-2 text-slate-400">This profile may be unavailable or the username may be incorrect.</p><Link to="/" className="mt-4 inline-block text-sky-300 underline">Back to VibePulse</Link></section>}
      {!loading && profile && <>
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><div className="flex items-start gap-4">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-sky-500/20 text-sky-200"><UserRound size={32}/></div>}
          <div className="min-w-0 flex-1"><h1 className="break-words text-2xl font-black">{profile.displayName || profile.username}</h1><p className="text-slate-400">@{profile.username}</p>{profile.bio && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{profile.bio}</p>}<p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14}/> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, {month:'long', year:'numeric'})}</p></div>
        </div><div className="mt-5 flex flex-wrap gap-5 border-t border-white/10 pt-4 text-sm"><span><b>{number(profile.followers)}</b> <span className="text-slate-400">followers</span></span><span><b>{number(profile.following)}</b> <span className="text-slate-400">following</span></span><span><b>{number(profile.postCount)}</b> <span className="text-slate-400">posts</span></span><span className="flex items-center gap-1"><Trophy size={15} className="text-amber-300"/><b>{number(profile.points)}</b> <span className="text-slate-400">points</span></span></div></section>
        <section className="mt-6"><h2 className="mb-4 text-xl font-bold">Public posts by {profile.displayName || profile.username}</h2>
          {posts.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-center text-slate-400">No public posts to show yet.</p>}
          <div className="space-y-4">{posts.map(post => <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
            <div className="p-4"><p className="text-xs text-slate-500">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</p>{post.caption && <p className="mt-2 whitespace-pre-wrap break-words">{post.caption}</p>}</div>
            {post.imageUrl && <img src={post.imageUrl} alt={post.caption || `Public post by ${profile.username}`} loading="lazy" className="max-h-[650px] w-full bg-black object-contain"/>}
            <div className="flex gap-5 border-t border-white/10 px-4 py-3 text-sm text-slate-400"><span><Heart size={15} className="mr-1 inline"/> {number(post._count?.likes)} likes</span><span><MessageCircle size={15} className="mr-1 inline"/> {number(post._count?.comments)} comments</span></div>
          </article>)}</div>
        </section>
        <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5 text-center"><p className="font-semibold">Join the VibePulse community</p><p className="mt-1 text-sm text-slate-400">Create an account to share posts, follow people, and join community activities.</p><Link to="/register" className="mt-3 inline-block rounded-xl bg-sky-500 px-4 py-2 font-bold text-slate-950">Create free account</Link></div>
      </>}
    </div>
  </main>;
}
