import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observer = useRef();

  const loadPosts = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await api.get(`/posts/feed?limit=10&offset=${currentOffset}`);
      const newPosts = res.data;
      if (reset) { setPosts(newPosts); setOffset(10); }
      else { setPosts(prev => [...prev, ...newPosts]); setOffset(currentOffset + 10); }
      setHasMore(newPosts.length === 10);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadPosts(true); }, []);

  const lastPostRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) loadPosts();
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Home</h1>
      <CreatePost onPostCreated={(post) => setPosts(prev => [post, ...prev])} />
      {posts.map((post, i) => (
        <div key={post.id} ref={i === posts.length - 1 ? lastPostRef : null}>
          <PostCard post={post} onUpdate={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))} onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
        </div>
      ))}
      {loading && <div className="text-center py-4 text-gray-500">Loading...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center py-4 text-gray-500">No more posts</div>}
      {posts.length === 0 && !loading && <div className="text-center py-8 text-gray-500">No posts yet. Follow users to see their posts!</div>}
    </div>
  );
}