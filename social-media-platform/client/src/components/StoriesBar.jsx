import { useEffect, useRef, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { mediaUrl } from '../services/media';

export default function StoriesBar() {
  const [stories, setStories] = useState([]);
  const [open, setOpen] = useState(null);
  const [text, setText] = useState('');
  const [background, setBackground] = useState('#2563eb');
  const [creating, setCreating] = useState(false);
  const input = useRef();

  const load = async () => { try { const res = await api.get('/stories'); setStories(res.data || []); } catch {} };
  useEffect(() => { load(); }, []);

  const createTextStory = async () => {
    if (!text.trim()) return;
    setCreating(true);
    try { await api.post('/stories', { media_type: 'text', text_content: text.trim(), background_color: background, text_color: '#fff' }); setText(''); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Could not create story'); }
    finally { setCreating(false); }
  };

  const createMediaStory = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('media', file); fd.append('media_type', file.type.startsWith('video/') ? 'video' : 'image');
    try { await api.post('/stories', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Could not create story'); }
  };

  const view = async (story) => {
    setOpen(story);
    try { await api.post(`/stories/${story.id}/view`); setStories(prev => prev.map(s => s.id === story.id ? { ...s, is_viewed: true } : s)); } catch {}
  };

  const index = open ? stories.findIndex(s => s.id === open.id) : -1;
  const move = (delta) => { const next = stories[index + delta]; if (next) view(next); };

  return <>
    <div className="card p-3 mb-4 overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        <button onClick={() => input.current?.click()} className="w-20 shrink-0 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus /></div>
          <span className="text-xs mt-1 block">Add story</span>
        </button>
        <input ref={input} hidden type="file" accept="image/*,video/*" onChange={e => { createMediaStory(e.target.files?.[0]); e.target.value=''; }} />
        {stories.map(story => <button key={story.id} onClick={() => view(story)} className="w-20 shrink-0 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full p-0.5 ${story.is_viewed ? 'bg-gray-300' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'}`}>
            <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-900 overflow-hidden flex items-center justify-center" style={{ background: story.background_color || '#111' }}>
              {story.media_url ? (story.media_type === 'video' ? <video src={mediaUrl(story.media_url)} className="w-full h-full object-cover" muted /> : <img src={mediaUrl(story.media_url)} className="w-full h-full object-cover" alt="" />) : <span className="text-white text-xs px-1 line-clamp-3">{story.text_content}</span>}
            </div>
          </div>
          <span className="text-xs mt-1 block truncate">{story.full_name || story.username}</span>
        </button>)}
      </div>
      <div className="mt-3 flex gap-2">
        <input className="input flex-1" value={text} onChange={e => setText(e.target.value)} placeholder="Quick text story..." maxLength={500} />
        <button className="btn-primary" disabled={creating || !text.trim()} onClick={createTextStory}>Post</button>
      </div>
      <div className="flex gap-2 mt-2">{['#2563eb','#7c3aed','#db2777','#059669','#111827'].map(c => <button key={c} onClick={() => setBackground(c)} className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ background: c }} aria-label="Story background" />)}</div>
    </div>

    {open && <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4">
      <button onClick={() => setOpen(null)} className="absolute top-5 right-5 text-white"><X /></button>
      <button onClick={() => move(-1)} className="absolute left-4 text-white disabled:opacity-30" disabled={index <= 0}><ChevronLeft size={36} /></button>
      <div className="w-full max-w-md h-[75vh] rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: open.background_color || '#111' }}>
        {open.media_url ? (open.media_type === 'video' ? <video src={mediaUrl(open.media_url)} controls autoPlay className="max-h-full max-w-full" /> : <img src={mediaUrl(open.media_url)} className="max-h-full max-w-full object-contain" alt="" />) : <p className="text-white text-2xl text-center px-8 whitespace-pre-wrap">{open.text_content}</p>}
      </div>
      <button onClick={() => move(1)} className="absolute right-4 text-white disabled:opacity-30" disabled={index < 0 || index >= stories.length - 1}><ChevronRight size={36} /></button>
    </div>}
  </>;
}
