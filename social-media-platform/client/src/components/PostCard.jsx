import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

export default function PostCard({ post, onUpdate, onDelete }) {
  const [liked, setLiked] = useState(post.is_liked);
  const [saved, setSaved] = useState(post.is_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLike = async () => {
    try {
      const res = await api.post(`/reactions/${post.id}`, { type: 'like' });
      setLiked(res.data.action !== 'removed');
      setLikesCount(prev => res.data.action === 'removed' ? prev - 1 : prev + 1);
    } catch {}
  };

  const handleSave = async () => {
    try {
      const res = await api.post(`/bookmarks/${post.id}`);
      setSaved(res.data.saved);
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try { await api.delete(`/posts/${post.id}`); onDelete?.(post.id); } catch {}
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3">
          <img src={post.profile_picture || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-sm">{post.full_name} {post.is_verified && <span className="text-blue-500">✓</span>}</p>
            <p className="text-xs text-gray-500">@{post.username} · {formatDistanceToNow(new Date(post.created_at))} ago</p>
          </div>
        </Link>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 hover:bg-gray-100 rounded-full"><MoreHorizontal size={18} /></button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100">Copy link</button>
              {post.user_id === (JSON.parse(localStorage.getItem('user') || '{}').id) && (
                <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
              )}
            </div>
          )}
        </div>
      </div>

      <Link to={`/post/${post.id}`}>
        <p className="mb-3 whitespace-pre-wrap">{post.content}</p>
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-2 mb-3 ${post.media.length === 1 ? 'grid-cols-1' : post.media.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {post.media.map(m => m.url && (
              m.type === 'video' 
                ? <video key={m.id} src={m.url} controls className="rounded-lg w-full max-h-96 object-cover" />
                : <img key={m.id} src={m.url} alt="" className="rounded-lg w-full h-64 object-cover" />
            ))}
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-6">
          <button onClick={handleLike} className={`flex items-center gap-1.5 ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> {likesCount}
          </button>
          <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500">
            <MessageCircle size={18} /> {post.comments_count}
          </Link>
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-green-500">
            <Share2 size={18} /> {post.shares_count}
          </button>
        </div>
        <button onClick={handleSave} className={`${saved ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}