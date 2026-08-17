import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PostCard from '../components/PostCard';
import Comments from '../components/Comments';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await api.get(`/posts/${id}`); setPost(res.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [id]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!post) return <div className="text-center py-8">Post not found</div>;

  return <>
    <PostCard post={post} onUpdate={updated => setPost(prev => ({ ...prev, ...updated }))} onDelete={() => setPost(null)} />
    <Comments postId={id} currentUser={user} onCountChange={count => setPost(prev => prev ? ({ ...prev, comments_count: count }) : prev)} />
  </>;
}
