import { useState, useEffect } from 'react';
import api from '../services/api';
import PostCard from '../components/PostCard';

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookmarks').then(res => { setBookmarks(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Saved Posts</h1>
      {loading ? <div className="text-center py-8">Loading...</div> : (
        bookmarks.map(b => <PostCard key={b.id} post={{...b, is_saved: true}} />)
      )}
      {bookmarks.length === 0 && !loading && <div className="text-center py-8 text-gray-500">No saved posts yet</div>}
    </div>
  );
}