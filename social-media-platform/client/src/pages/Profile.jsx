
import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Link as LinkIcon, Calendar, MessageCircle, VolumeX, Camera, X, UploadCloud } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { mediaUrl } from '../services/media';
import { cloudinaryConfigured, uploadImageToCloudinary } from '../services/cloudinary';

function PhotoEditor({ title, currentUrl, onSave, onClose }) {
  const [url, setUrl] = useState(currentUrl || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const chooseFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      setUrl(uploadedUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>

        <div className="mb-4 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900">
          {url ? <img src={url} alt="Preview" className="w-full h-48 object-cover" /> : <div className="h-48 flex items-center justify-center text-gray-500">No image selected</div>}
        </div>

        <label className="block text-sm font-medium mb-1">Direct image URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="input mb-3" placeholder="https://..." type="url" />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!cloudinaryConfigured || uploading} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <UploadCloud size={17} /> {uploading ? 'Uploading...' : 'Upload image'}
          </button>
          <input ref={fileRef} onChange={chooseFile} type="file" accept="image/*" className="hidden" />
          <button type="button" onClick={() => onSave(url)} disabled={!url.trim() || uploading} className="btn-primary">Save photo</button>
        </div>

        {!cloudinaryConfigured && <p className="text-xs text-amber-600 mt-3">Direct URLs work now. To enable free third-party uploads, configure Cloudinary in the client environment.</p>}
      </div>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, setUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [photoEditor, setPhotoEditor] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/profile/${username}`),
        api.get(`/posts/user/${username}?limit=20`)
      ]);
      setProfile(profileRes.data);
      setPosts(postsRes.data);
    } catch (err) {
      if (err.response?.status === 404) setProfile(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [username]);

  const handleFollow = async () => {
    try {
      if (profile.is_following) {
        await api.post(`/users/unfollow/${profile.id}`);
        setProfile({ ...profile, is_following: false, followers_count: Math.max(0, Number(profile.followers_count) - 1) });
      } else {
        const res = await api.post(`/users/follow/${profile.id}`);
        setProfile({ ...profile, is_following: res.data.status === 'accepted', follow_status: res.data.status, followers_count: res.data.status === 'accepted' ? Number(profile.followers_count) + 1 : profile.followers_count });
      }
    } catch {}
  };

  const handleMute = async () => {
    try {
      if (profile.is_muted) { await api.post(`/users/unmute/${profile.id}`); setProfile({ ...profile, is_muted: false }); }
      else { await api.post(`/users/mute/${profile.id}`); setProfile({ ...profile, is_muted: true }); }
    } catch (err) { alert(err.response?.data?.error || 'Could not update mute setting'); }
  };

  const handleMessage = async () => {
    if (startingChat || !profile?.id) return;
    setStartingChat(true);
    try {
      const res = await api.post('/messages/conversations', { participantId: profile.id });
      navigate(`/messages/${res.data.id}`);
    } catch {} finally { setStartingChat(false); }
  };

  const savePhoto = async (field, url) => {
    try {
      const endpoint = field === 'profile_picture' ? '/users/profile-picture' : '/users/cover-photo';
      const res = await api.post(endpoint, { url: url.trim() });
      const next = { ...profile, [field]: res.data[field] };
      setProfile(next);
      if (currentUser?.id === profile.id) setUser({ ...currentUser, [field]: res.data[field] });
      setPhotoEditor(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save photo');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!profile) return <div className="text-center py-8">User not found</div>;

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div>
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-xl overflow-hidden">
        {profile.cover_photo && <img src={mediaUrl(profile.cover_photo)} alt="" className="w-full h-full object-cover" />}
        {isOwnProfile && (
          <button onClick={() => setPhotoEditor({ field: 'cover_photo', title: 'Update cover photo' })} className="absolute right-3 bottom-3 btn-secondary flex items-center gap-2 shadow-lg">
            <Camera size={17} /> Cover
          </button>
        )}
      </div>

      <div className="card -mt-16 mx-2 sm:mx-4 p-4 sm:p-6 relative">
        <div className="flex items-end justify-between mb-4 gap-3">
          <div className="relative">
            <img src={mediaUrl(profile.profile_picture) || '/default-avatar.svg'} alt="" className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 object-cover bg-white" />
            {isOwnProfile && (
              <button onClick={() => setPhotoEditor({ field: 'profile_picture', title: 'Update profile picture' })} className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white border-2 border-white" aria-label="Change profile picture">
                <Camera size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {!isOwnProfile && <>
              <button onClick={handleFollow} className="btn-primary">
                {profile.is_following ? 'Unfollow' : profile.follow_status === 'pending' ? 'Requested' : 'Follow'}
              </button>
              <button type="button" onClick={handleMute} className="btn-secondary flex items-center gap-1"><VolumeX size={18} /> {profile.is_muted ? 'Unmute' : 'Mute'}</button>
              <button type="button" onClick={handleMessage} disabled={startingChat} className="btn-secondary" title="Message"><MessageCircle size={18} /></button>
            </>}
            {isOwnProfile && <Link to="/settings" className="btn-secondary">Edit Profile</Link>}
          </div>
        </div>

        <h1 className="text-xl font-bold">{profile.full_name} {profile.is_verified && <span className="text-blue-500">✓</span>}</h1>
        <p className="text-gray-500">@{profile.username}</p>
        {profile.bio && <p className="mt-2 whitespace-pre-wrap">{profile.bio}</p>}

        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
          {profile.location && <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>}
          {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><LinkIcon size={14} /> {profile.website}</a>}
          <span className="flex items-center gap-1"><Calendar size={14} /> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
        </div>

        <div className="flex gap-6 mt-4 text-sm sm:text-base">
          <span className="font-semibold">{profile.following_count} <span className="text-gray-500 font-normal">Following</span></span>
          <span className="font-semibold">{profile.followers_count} <span className="text-gray-500 font-normal">Followers</span></span>
          <span className="font-semibold">{profile.posts_count} <span className="text-gray-500 font-normal">Posts</span></span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['posts', 'media', 'likes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-medium capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>{tab}</button>
          ))}
        </div>
        <div className="mt-4">
          {activeTab === 'posts' && posts.map(post =>
            <PostCard key={post.id} post={post}
              onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
              onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
            />
          )}
          {activeTab === 'posts' && posts.length === 0 && <div className="text-center py-8 text-gray-500">No posts yet</div>}
          {activeTab !== 'posts' && <div className="text-center py-8 text-gray-500">This tab is ready for future filtering.</div>}
        </div>
      </div>

      {photoEditor && (
        <PhotoEditor
          title={photoEditor.title}
          currentUrl={profile[photoEditor.field]}
          onClose={() => setPhotoEditor(null)}
          onSave={(url) => savePhoto(photoEditor.field, url)}
        />
      )}
    </div>
  );
}
