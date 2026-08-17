import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { mediaUrl } from '../services/media';

function CommentItem({ comment, currentUser, onChanged, depth = 0 }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState([]);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content || '');
  const [liked, setLiked] = useState(Boolean(comment.is_liked));
  const [likes, setLikes] = useState(Number(comment.likes_count || 0));

  const loadReplies = async () => {
    try {
      const res = await api.get(`/comments/${comment.id}/replies`);
      setReplies(res.data);
      setRepliesOpen(true);
    } catch {}
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      const res = await api.post(`/comments/post/${comment.post_id}`, { content: reply.trim(), parent_id: comment.id });
      setReplies(prev => [...prev, res.data]);
      setReply(''); setReplyOpen(false); setRepliesOpen(true);
      onChanged?.();
    } catch (err) { alert(err.response?.data?.error || 'Could not reply'); }
  };

  const toggleLike = async () => {
    try {
      const res = await api.post(`/comments/${comment.id}/like`);
      setLiked(res.data.liked);
      setLikes(v => Math.max(0, v + (res.data.liked ? 1 : -1)));
    } catch {}
  };

  const saveEdit = async () => {
    if (!text.trim()) return;
    try {
      const res = await api.patch(`/comments/${comment.id}`, { content: text.trim() });
      comment.content = res.data.content;
      setEditing(false);
      onChanged?.();
    } catch (err) { alert(err.response?.data?.error || 'Could not edit comment'); }
  };

  const remove = async () => {
    if (!confirm('Delete this comment?')) return;
    try { await api.delete(`/comments/${comment.id}`); onChanged?.(comment.id); }
    catch (err) { alert(err.response?.data?.error || 'Could not delete comment'); }
  };

  return (
    <div className={depth ? 'ml-8 mt-3' : 'mt-4'}>
      <div className="flex gap-3">
        <img src={mediaUrl(comment.profile_picture) || '/default-avatar.svg'} className="w-9 h-9 rounded-full object-cover" alt="" />
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2">
            <p className="font-semibold text-sm">{comment.full_name || comment.username}</p>
            {editing ? <textarea value={text} onChange={e => setText(e.target.value)} className="input mt-2 min-h-20" /> : <p className="whitespace-pre-wrap break-words">{comment.content}</p>}
          </div>
          <div className="flex items-center gap-4 px-2 pt-1 text-xs text-gray-500">
            <span>{formatDistanceToNow(new Date(comment.created_at))} ago</span>
            <button onClick={toggleLike} className={liked ? 'text-red-500' : 'hover:text-red-500'}><Heart size={13} className="inline" fill={liked ? 'currentColor' : 'none'} /> {likes}</button>
            {depth === 0 && <button onClick={() => setReplyOpen(v => !v)}><MessageCircle size={13} className="inline" /> Reply</button>}
            {String(comment.user_id) === String(currentUser?.id) && !editing && <button onClick={() => setEditing(true)}><Edit2 size={13} className="inline" /> Edit</button>}
            {String(comment.user_id) === String(currentUser?.id) && <button onClick={remove} className="text-red-500"><Trash2 size={13} className="inline" /> Delete</button>}
            {editing && <><button onClick={() => { setEditing(false); setText(comment.content); }}>Cancel</button><button onClick={saveEdit} className="text-blue-600">Save</button></>}
          </div>
        </div>
      </div>

      {replyOpen && depth === 0 && <form onSubmit={submitReply} className="ml-12 mt-2 flex gap-2"><input className="input flex-1" value={reply} onChange={e => setReply(e.target.value)} placeholder={`Reply to @${comment.username}`} /><button className="btn-primary" type="submit"><Send size={16}/></button></form>}
      {depth === 0 && Number(comment.replies_count || 0) > 0 && <button onClick={() => repliesOpen ? setRepliesOpen(false) : loadReplies()} className="ml-12 mt-2 text-sm text-blue-600 flex items-center gap-1">{repliesOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {repliesOpen ? 'Hide replies' : `View ${comment.replies_count} replies`}</button>}
      {repliesOpen && replies.map(r => <CommentItem key={r.id} comment={r} currentUser={currentUser} onChanged={() => loadReplies()} depth={1} />)}
    </div>
  );
}

export default function Comments({ postId, currentUser, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await api.get(`/comments/post/${postId}`); setComments(res.data); onCountChange?.(res.data.length); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [postId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const res = await api.post(`/comments/post/${postId}`, { content: text.trim() });
      setComments(prev => [res.data, ...prev]);
      setText('');
      onCountChange?.(comments.length + 1);
    } catch (err) { alert(err.response?.data?.error || 'Could not comment'); }
  };

  const removeFromList = (id) => {
    if (id) {
      setComments(prev => {
        const next = prev.filter(c => c.id !== id);
        onCountChange?.(next.length);
        return next;
      });
    } else {
      load();
    }
  };

  return <div className="card p-4 mt-4">
    <h3 className="font-bold text-lg mb-3">Comments</h3>
    <form onSubmit={submit} className="flex gap-2 mb-4">
      <input className="input flex-1" placeholder="Write a comment... Use @username to mention someone" value={text} onChange={e => setText(e.target.value)} />
      <button className="btn-primary" type="submit" disabled={!text.trim()}><Send size={17}/></button>
    </form>
    {loading ? <p className="text-gray-500 text-sm">Loading comments...</p> : comments.length === 0 ? <p className="text-gray-500 text-sm">No comments yet.</p> : comments.map(c => <CommentItem key={c.id} comment={c} currentUser={currentUser} onChanged={removeFromList} />)}
  </div>;
}
