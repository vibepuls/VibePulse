import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { mediaUrl, avatarUrl, handleAvatarError } from '../services/media';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const [results, setResults] = useState({ users: [], posts: [], hashtags: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) return;
    setLoading(true);
    api.get(`/search?q=${encodeURIComponent(query)}&type=${type}`).then(res => {
      setResults(res.data); setLoading(false);
    }).catch(() => setLoading(false));
  }, [query, type]);

  return (
    <div>
      <div className="card p-4 mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search users, posts, hashtags..." value={query}
            onChange={e => setSearchParams({ q: e.target.value, type })}
            className="input pl-10" />
        </div>
        <div className="flex gap-2 mt-3">
          {['all', 'users', 'posts', 'hashtags'].map(t => (
            <button key={t} onClick={() => setSearchParams({ q: query, type: t })}
              className={`px-3 py-1 rounded-full text-sm capitalize ${type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-8">Searching...</div>}

      {(type === 'all' || type === 'users') && results.users.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-bold mb-3">Users</h3>
          <div className="space-y-3">
            {results.users.map(u => (
              <Link key={u.id} to={`/profile/${u.username}`} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                <img
                  src={avatarUrl(u.profile_picture, u.full_name || u.username)}
                  onError={(event) => handleAvatarError(event, u.full_name || u.username)}
                  alt={`${u.full_name || u.username || 'User'} avatar`}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div><p className="font-medium">{u.full_name}</p><p className="text-sm text-gray-500">@{u.username}</p></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(type === 'all' || type === 'posts') && results.posts.length > 0 && (
        results.posts.map(post => <PostCard key={post.id} post={post} />)
      )}

      {(type === 'all' || type === 'hashtags') && results.hashtags.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-bold mb-3">Hashtags</h3>
          <div className="flex flex-wrap gap-2">
            {results.hashtags.map(h => (
              <Link key={h.id} to={`/search?q=%23${h.tag}&type=posts`} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-sm hover:bg-blue-100">
                #{h.tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && query.length >= 2 && results.users.length === 0 && results.posts.length === 0 && results.hashtags.length === 0 && (
        <div className="text-center py-8 text-gray-500">No results found</div>
      )}
    </div>
  );
}