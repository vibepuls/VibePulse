
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2, Edit2, X, Link2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { mediaUrl, avatarUrl, handleAvatarError } from '../services/media';
import MediaEmbed from './MediaEmbed';

export default function PostCard({ post, onUpdate, onDelete }) {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [reaction, setReaction] = useState(post.user_reaction || (post.is_liked ? 'like' : null));
  const [reactionOpen, setReactionOpen] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.is_saved));
  const [likesCount, setLikesCount] = useState(Number(post.likes_count || 0));
  const [sharesCount, setSharesCount] = useState(Number(post.shares_count || 0));
  const [commentsCount, setCommentsCount] = useState(Number(post.comments_count || 0));
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
      setLikesCount((prev) => Math.max(0, prev + (removed ? -1 : res.data.action === 'added' ? 1 : 0)));
      setReactionOpen(false);
    } catch (err) { alert(err.response?.data?.error || 'Could not update reaction'); }
  };

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
      setSharesCount((prev) => prev + 1);
      onUpdate?.(res.data);
      alert('Post shared successfully.');
    } catch (err) { alert(err.response?.data?.error || 'Failed to share post'); }
  };

  return (
    <article className="card p-4 mb-4 overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3 min-w-0">
          <img
            src={avatarUrl(post.profile_picture, post.full_name || post.username)}
            onError={(event) => handleAvatarError(event, post.full_name || post.username)}
            alt={`${post.full_name || post.username || 'User'} avatar`}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{post.full_name} {post.is_verified && <span className="text-blue-500">✓</span>}</p>
            <p className="text-xs text-gray-500 truncate">@{post.username} · {formatDistanceToNow(new Date(post.created_at))} ago</p>
          </div>
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" aria-label="Post menu">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`); setMenuOpen(false); alert('Post link copied.'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Link2 size={14} /> Copy link</button>
              {isOwner && <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Edit2 size={14} /> Edit</button>}
              {isOwner && <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Trash2 size={14} /> Delete</button>}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mb-4 space-y-2">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="input w-full min-h-24 resize-none" />
          <div className="flex items-center justify-between gap-2">
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="input w-auto">
              <option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1"><X size={15} /> Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {post.content && <Link to={`/post/${post.id}`} className="block mb-3"><p className="whitespace-pre-wrap break-words">{post.content}</p></Link>}
          {Array.isArray(post.media) && post.media.filter((m) => m?.url).map((media) => (
            <div key={media.id} className="mb-3">
              <MediaEmbed media={{ ...media, embed_url: mediaUrl(media.embed_url || media.url), url: mediaUrl(media.url) }} />
            </div>
          ))}
        </>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-5 sm:gap-6">
          <div className="relative">
            <button onClick={() => handleReaction('like')} onContextMenu={(e) => { e.preventDefault(); setReactionOpen((v) => !v); }} className={`flex items-center gap-1.5 ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`} title="Right-click for reactions">
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> {likesCount}
            </button>
            {reactionOpen && (
              <div className="absolute bottom-8 left-0 z-30 flex gap-1 rounded-full bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-2">
                {[['like','👍'],['love','❤️'],['haha','😂'],['wow','😮'],['sad','😢'],['angry','😡']].map(([type, emoji]) =>
                  <button key={type} onClick={() => handleReaction(type)} className="w-8 h-8 hover:scale-125 transition" title={type}>{emoji}</button>
                )}
              </div>
            )}
          </div>
          <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500"><MessageCircle size={18} /> {commentsCount}</Link>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-500 hover:text-green-500"><Share2 size={18} /> {sharesCount}</button>
        </div>
        <button onClick={handleSave} className={saved ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'} aria-label="Save post"><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
    </article>
  );
}
