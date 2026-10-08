import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';
import ShortsModal from '../components/ShortsModal';
import { getShortsFromPosts } from '../components/ShortsUtils';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [mode, setMode] = useState('following');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observer = useRef();
  const [shortViewerIndex, setShortViewerIndex] = useState(null);

  const loadPosts = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await api.get(`/posts/feed?mode=${mode}&limit=10&offset=${currentOffset}`);
      const newPosts = res.data;
      if (reset) { setPosts(newPosts); setOffset(10); }
      else { setPosts(prev => [...prev, ...newPosts]); setOffset(currentOffset + 10); }
      setHasMore(newPosts.length === 10);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadPosts(true); }, [mode]);

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
      <div className="flex items-center justify-between mb-4"><h1 className="text-2xl font-bold">Home</h1><div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">{[['following','Following'],['for-you','For You']].map(([value,label]) => <button key={value} onClick={() => { setMode(value); setOffset(0); setHasMore(true); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === value ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'}`}>{label}</button>)}</div></div>
      <StoriesBar />
      <CreatePost onPostCreated={(post) => setPosts(prev => [post, ...prev])} />
      {posts.map((post, i) => (
        <div key={post.id} ref={i === posts.length - 1 ? lastPostRef : null}>
          <PostCard post={post} onShortOpen={(selectedPost) => {
            const shorts = getShortsFromPosts(posts);
            const selected = getShortsFromPosts([selectedPost])[0];
            const selectedIndex = selected ? shorts.findIndex((item) => item.videoId === selected.videoId) : -1;
            if (selectedIndex >= 0) setShortViewerIndex(selectedIndex);
          }} onUpdate={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))} onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
        </div>
      ))}
      {loading && <div className="text-center py-4 text-gray-500">Loading...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center py-4 text-gray-500">No more posts</div>}
      {shortViewerIndex !== null && (() => {
        const shorts = getShortsFromPosts(posts);
        return (
          <ShortsModal
            shorts={shorts}
            initialIndex={shortViewerIndex}
            onClose={() => setShortViewerIndex(null)}
          />
        );
      })()}
      {posts.length === 0 && !loading && <div className="text-center py-8 text-gray-500">No posts yet. Follow users to see their posts!</div>}
    </div>
  );
}