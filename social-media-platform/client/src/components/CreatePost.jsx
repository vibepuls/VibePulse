import { useState, useRef } from 'react';
import { Image, X } from 'lucide-react';
import api from '../services/api';

export default function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);
  const fileInput = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('content', content);
    formData.append('privacy', privacy);
    files.forEach(f => formData.append('media', f));
    try {
      const res = await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setContent(''); setFiles([]); setPrivacy('public');
      onPostCreated(res.data);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create post'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <textarea placeholder="What's on your mind?" className="input resize-none h-24 mb-3" value={content} onChange={e => setContent(e.target.value)} />
        {files.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {files.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg" />
                <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInput.current.click()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Image size={20} /></button>
            <input ref={fileInput} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => setFiles([...files, ...Array.from(e.target.files)])} />
            <select value={privacy} onChange={e => setPrivacy(e.target.value)} className="text-sm border rounded-lg px-2 py-1 bg-transparent">
              <option value="public">Public</option>
              <option value="followers">Followers</option>
              <option value="private">Private</option>
            </select>
          </div>
          <button type="submit" disabled={loading || (!content.trim() && files.length === 0)} className="btn-primary disabled:opacity-50">{loading ? 'Posting...' : 'Post'}</button>
        </div>
      </form>
    </div>
  );
}