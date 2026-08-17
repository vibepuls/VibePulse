import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Link as LinkIcon, Calendar, Users, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { mediaUrl } from '../services/media';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => { fetchProfile(); }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/profile/${username}`),
        api.get(`/posts/user/${username}?limit=20`)
      ]);
      setProfile(profileRes.data);
      setPosts(postsRes.data);
    } catch (err) { if (err.response?.status === 404) setProfile(null); } finally { setLoading(false); }
  };

  const handleFollow = async () => {
    try {
      if (profile.is_following) {
        await api.post(`/users/unfollow/${profile.id}`);
        setProfile({...profile, is_following: false, followers_count: profile.followers_count - 1});
      } else {
        const res = await api.post(`/users/follow/${profile.id}`);
        setProfile({...profile, is_following: res.data.status === 'accepted', follow_status: res.data.status, followers_count: res.data.status === 'accepted' ? profile.followers_count + 1 : profile.followers_count});
      }
    } catch {}
  };

  const handleMessage = async () => {
    if (startingChat || !profile?.id) return;
    setStartingChat(true);
    try {
      const res = await api.post('/messages/conversations', { participantId: profile.id });
      navigate(`/messages/${res.data.id}`);
    } catch {} finally {
      setStartingChat(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!profile) return <div className="text-center py-8">User not found</div>;

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div>
      <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-xl">
        {profile.cover_photo && <img src={mediaUrl(profile.cover_photo)} alt="" className="w-full h-full object-cover rounded-t-xl" />}
      </div>
      <div className="card -mt-16 mx-4 p-6 relative">
        <div className="flex items-end justify-between mb-4">
          <img src={mediaUrl(profile.profile_picture) || '/default-avatar.svg'} alt="" className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 object-cover" />
          <div className="flex gap-2">
            {!isOwnProfile && (
              <>
                <button onClick={handleFollow} className="btn-primary">
                  {profile.is_following ? 'Unfollow' : profile.follow_status === 'pending' ? 'Requested' : 'Follow'}
                </button>
                <button type="button" onClick={handleMessage} disabled={startingChat} className="btn-secondary disabled:opacity-50" title="Message">
                  <MessageCircle size={18} />
                </button>
              </>
            )}
            {isOwnProfile && <Link to="/settings" className="btn-secondary">Edit Profile</Link>}
          </div>
        </div>
        <h1 className="text-xl font-bold">{profile.full_name} {profile.is_verified && <span className="text-blue-500">✓</span>}</h1>
        <p className="text-gray-500">@{profile.username}</p>
        {profile.bio && <p className="mt-2">{profile.bio}</p>}
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
          {profile.location && <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>}
          {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><LinkIcon size={14} /> {profile.website}</a>}
          <span className="flex items-center gap-1"><Calendar size={14} /> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
        </div>
        <div className="flex gap-6 mt-4">
          <span className="font-semibold">{profile.following_count} <span className="text-gray-500 font-normal">Following</span></span>
          <span className="font-semibold">{profile.followers_count} <span className="text-gray-500 font-normal">Followers</span></span>
          <span className="font-semibold">{profile.posts_count} <span className="text-gray-500 font-normal">Posts</span></span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['posts', 'media', 'likes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-medium capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {activeTab === 'posts' && posts.map(post => <PostCard key={post.id} post={post} onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />)}
          {activeTab === 'posts' && posts.length === 0 && <div className="text-center py-8 text-gray-500">No posts yet</div>}
        </div>
      </div>
    </div>
  );
}