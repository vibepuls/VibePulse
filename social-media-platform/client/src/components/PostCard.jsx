import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2, Edit2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { mediaUrl } from '../services/media';

export default function PostCard({ post, onUpdate, onDelete }) {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [reaction, setReaction] = useState(post.user_reaction || (post.is_liked ? 'like' : null));
  const [reactionOpen, setReactionOpen] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.is_saved));
  const [likesCount, setLikesCount] = useState(Number(post.likes_count || 0));
  const [sharesCount, setSharesCount] = useState(Number(post.shares_count || 0));
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content || '');
  const [privacy, setPrivacy] = useState(post.privacy || 'public');
  const [saving, setSaving] = useState(false);

  const isOwner = String(post.user_id) === String(currentUser.id);

  const handleReaction = async (type = 'like') => {
    try {
      const res = await api.post(`/reactions/${post.id}`, { type });
      const removed = res.data.action === 'removed';
      setLiked(!removed);
      setReaction(removed ? null : type);
      setLikesCount(prev => Math.max(0, prev + (removed ? -1 : res.data.action === 'added' ? 1 : 0)));
      setReactionOpen(false);
    } catch (err) { alert(err.response?.data?.error || 'Could not update reaction'); }
  };

  const handleLike = () => handleReaction('like');

  const handleSave = async () => {
    try {
      const res = await api.post(`/bookmarks/${post.id}`);
      setSaved(res.data.saved);
    } catch (err) { alert(err.response?.data?.error || 'Could not update bookmark'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try { await api.delete(`/posts/${post.id}`); onDelete?.(post.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete post'); }
  };

  const handleEdit = async () => {
    if (!content.trim()) return alert('Post cannot be empty.');
    setSaving(true);
    try {
      const res = await api.patch(`/posts/${post.id}`, { content, privacy });
      setEditing(false);
      onUpdate?.(res.data);
    } catch (err) { alert(err.response?.data?.error || 'Failed to edit post'); }
    finally { setSaving(false); }
  };

  const handleShare = async () => {
    try {
      const res = await api.post(`/posts/${post.id}/share`, { content: '' });
      setSharesCount(prev => prev + 1);
      onUpdate?.(res.data);
      alert('Post shared successfully.');
    } catch (err) { alert(err.response?.data?.error || 'Failed to share post'); }
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3">
          <img src={mediaUrl(post.profile_picture) || '/default-avatar.svg'} alt="" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-sm">{post.full_name} {post.is_verified && <span className="text-blue-500">✓</span>}</p>
            <p className="text-xs text-gray-500">@{post.username} · {formatDistanceToNow(new Date(post.created_at))} ago</p>
          </div>
        </Link>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 hover:bg-gray-100 rounded-full"><MoreHorizontal size={18} /></button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); setMenuOpen(false); alert('Post link copied.'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100">Copy link</button>
              {isOwner && <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"><Edit2 size={14} /> Edit</button>}
              {isOwner && <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"><Trash2 size={14} /> Delete</button>}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mb-4 space-y-2">
          <textarea value={content} onChange={e => setContent(e.target.value)} className="input w-full min-h-24 resize-none" />
          <div className="flex items-center justify-between gap-2">
            <select value={privacy} onChange={e => setPrivacy(e.target.value)} className="input w-auto">
              <option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option>
            </select>
            <div className="flex gap-2"><button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1"><X size={15}/>Cancel</button><button onClick={handleEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></div>
          </div>
        </div>
      ) : (
        <Link to={`/post/${post.id}`}>
          <p className="mb-3 whitespace-pre-wrap">{post.content}</p>
          {post.media && post.media.length > 0 && (
            <div className={`grid gap-2 mb-3 ${post.media.length === 1 ? 'grid-cols-1' : post.media.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {post.media.map(m => m.url && (
                m.type === 'video'
                  ? <video key={m.id} src={mediaUrl(m.url)} controls className="rounded-lg w-full max-h-96 object-cover" />
                  : <img key={m.id} src={mediaUrl(m.url)} alt="" className="rounded-lg w-full h-64 object-cover" />
              ))}
            </div>
          )}
        </Link>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-6">
          <div className="relative"><button onClick={handleLike} onContextMenu={e => { e.preventDefault(); setReactionOpen(v => !v); }} className={`flex items-center gap-1.5 ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`} title="Right-click for reactions"><Heart size={18} fill={liked ? 'currentColor' : 'none'} /> {likesCount}</button>{reactionOpen && <div className="absolute bottom-8 left-0 z-30 flex gap-1 rounded-full bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-2">{[['like','👍'],['love','❤️'],['haha','😂'],['wow','😮'],['sad','😢'],['angry','😡']].map(([type,emoji]) => <button key={type} onClick={() => handleReaction(type)} className="w-8 h-8 hover:scale-125 transition" title={type}>{emoji}</button>)}</div>}</div>
          <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500"><MessageCircle size={18} /> {post.comments_count || 0}</Link>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-500 hover:text-green-500"><Share2 size={18} /> {sharesCount}</button>
        </div>
        <button onClick={handleSave} className={`${saved ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
    </div>
  );
}
