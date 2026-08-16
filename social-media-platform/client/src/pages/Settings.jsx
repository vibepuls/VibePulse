import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor, Lock, Shield, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState({ full_name: '', bio: '', website: '', location: '' });
  const [privacy, setPrivacy] = useState({});
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.full_name || '', bio: user.bio || '', website: user.website || '', location: user.location || '' });
      api.get('/users/privacy').then(res => setPrivacy(res.data));
    }
  }, [user]);

  const updateProfile = async (e) => {
    e.preventDefault();
    try { await api.patch('/users/profile', profile); setMessage('Profile updated!'); setTimeout(() => setMessage(''), 3000); } catch {}
  };

  const updatePrivacy = async (key, value) => {
    try { const res = await api.patch('/users/privacy', { [key]: value }); setPrivacy(res.data); } catch {}
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.newPassword.value !== form.confirmPassword.value) { alert('Passwords do not match'); return; }
    try { await api.post('/auth/change-password', { currentPassword: form.currentPassword.value, newPassword: form.newPassword.value }); alert('Password changed. Please log in again.'); logout(); } catch (err) { alert(err.response?.data?.error); }
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    const password = prompt('Enter your password to confirm:');
    if (!password) return;
    try { await api.delete('/users/account', { data: { password } }); logout(); } catch (err) { alert(err.response?.data?.error); }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['profile', 'privacy', 'security', 'appearance'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={updateProfile} className="card p-6 space-y-4">
          <h3 className="font-bold text-lg">Edit Profile</h3>
          <input type="text" placeholder="Full Name" className="input" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} />
          <textarea placeholder="Bio" className="input h-24 resize-none" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
          <input type="text" placeholder="Website" className="input" value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})} />
          <input type="text" placeholder="Location" className="input" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} />
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      )}

      {activeTab === 'privacy' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-lg">Privacy Settings</h3>
          {['who_can_follow', 'who_can_message', 'who_can_comment', 'who_can_mention'].map(key => (
            <div key={key} className="flex items-center justify-between">
              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
              <select value={privacy[key] || 'everyone'} onChange={e => updatePrivacy(key, e.target.value)} className="input w-auto">
                <option value="everyone">Everyone</option>
                <option value="followers">Followers</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <form onSubmit={changePassword} className="card p-6 space-y-4">
            <h3 className="font-bold text-lg">Change Password</h3>
            <input type="password" name="currentPassword" placeholder="Current Password" className="input" required />
            <input type="password" name="newPassword" placeholder="New Password" className="input" required minLength={6} />
            <input type="password" name="confirmPassword" placeholder="Confirm New Password" className="input" required />
            <button type="submit" className="btn-primary">Change Password</button>
          </form>
          <div className="card p-6">
            <h3 className="font-bold text-lg text-red-600 mb-2">Danger Zone</h3>
            <button onClick={deleteAccount} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg"><Trash2 size={18} /> Delete Account</button>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-lg">Theme</h3>
          <div className="flex gap-3">
            {[{value: 'light', icon: Sun, label: 'Light'}, {value: 'dark', icon: Moon, label: 'Dark'}, {value: 'system', icon: Monitor, label: 'System'}].map(t => (
              <button key={t.value} onClick={() => setTheme(t.value)} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 ${theme === t.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <t.icon size={24} />
                <span className="text-sm">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}