import { useMemo, useState } from 'react';
import { Link2, Sparkles, X } from 'lucide-react';
import api from '../services/api';
import { detectEmbed } from './MediaEmbed';

export default function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => detectEmbed(mediaUrl), [mediaUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/posts', {
        content: content.trim(),
        media_url: mediaUrl.trim() || undefined,
        privacy,
        type: mediaUrl.trim() ? 'link' : 'text'
      });
      setContent('');
      setMediaUrl('');
      setPrivacy('public');
      onPostCreated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Sparkles size={17} className="text-blue-600" />
        Create a Vibe
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
          placeholder="What's on your mind? Add #hashtags or @mentions..."
          className="input resize-none min-h-28 mb-3"
        />

        <div className="relative mb-3">
          <Link2 size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Paste a YouTube, Facebook, Instagram, image or video URL"
            className="input pl-10 pr-10"
            inputMode="url"
            type="url"
          />
          {mediaUrl && (
            <button type="button" onClick={() => setMediaUrl('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700" aria-label="Clear media URL">
              <X size={18} />
            </button>
          )}
        </div>

        {mediaUrl && (
          <div className={`mb-3 rounded-xl border p-3 ${preview ? 'border-blue-100 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
            {preview ? (
              <div className="text-sm text-blue-700 dark:text-blue-300">Detected: <strong className="capitalize">{preview.provider}</strong> {preview.type} — media bytes stay on the original host.</div>
            ) : (
              <div className="text-sm text-red-600">Unsupported URL. Use YouTube, Facebook, Instagram, or a direct image/video URL.</div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-transparent">
            <option value="public">Public</option>
            <option value="followers">Followers</option>
            <option value="private">Private</option>
          </select>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !mediaUrl.trim()) || (mediaUrl.trim() && !preview)}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
