import { useState, useEffect } from 'react';
import api from '../services/api';
import PostCard from '../components/PostCard';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/trending?limit=20').then(res => { setPosts(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Explore</h1>
      {loading ? <div className="text-center py-8">Loading...</div> : (
        posts.map(post => <PostCard key={post.id} post={post} />)
      )}
      {posts.length === 0 && !loading && <div className="text-center py-8 text-gray-500">No trending posts</div>}
    </div>
  );
}