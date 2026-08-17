import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function RightSidebar() {
  const [trending, setTrending] = useState([]);
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    api.get('/search?q=trending&type=hashtags').then(res => setTrending(res.data.hashtags || [])).catch(() => {});
    api.get('/users/search?q=').then(res => setSuggested(res.data.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h3 className="font-bold text-lg mb-3">Trending</h3>
        {trending.length === 0 ? <p className="text-gray-500 text-sm">No trending topics</p> : (
          <div className="space-y-2">
            {trending.map(tag => (
              <Link key={tag.id} to={`/search?q=%23${tag.tag}&type=posts`} className="block hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                <p className="font-medium text-blue-600">#{tag.tag}</p>
                <p className="text-xs text-gray-500">{tag.usage_count} posts</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-bold text-lg mb-3">Who to follow</h3>
        {suggested.length === 0 ? <p className="text-gray-500 text-sm">No suggestions</p> : (
          <div className="space-y-3">
            {suggested.map(u => (
              <Link key={u.id} to={`/profile/${u.username}`} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                <img src={u.profile_picture || '/default-avatar.svg'} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-medium text-sm">{u.full_name}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}