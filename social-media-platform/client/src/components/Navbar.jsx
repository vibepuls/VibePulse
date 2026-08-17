import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, Bell, Sun, Moon, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { mediaUrl } from '../services/media';

function Badge({ count }) { return count > 0 ? <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">{count > 99 ? '99+' : count}</span> : null; }

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const refreshCounts = async () => {
    if (!user) return;
    try {
      const [n, m] = await Promise.all([api.get('/notifications/unread-count'), api.get('/messages/unread-count')]);
      setNotificationCount(Number(n.data.count || 0));
      setMessageCount(Number(m.data.count || 0));
    } catch {}
  };

  useEffect(() => { refreshCounts(); const t = setInterval(refreshCounts, 5000); return () => clearInterval(t); }, [user]);
  useEffect(() => { const h = () => refreshCounts(); window.addEventListener('vibepulse:counts-refresh', h); return () => window.removeEventListener('vibepulse:counts-refresh', h); }, [user]);

  const handleSearch = e => { e.preventDefault(); if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); };
  const handleLogout = async () => { try { await api.post('/auth/logout'); } catch {} logout(); navigate('/login'); };

  return <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-blue-600">SocialApp</Link>
      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8"><input type="text" placeholder="Search users, posts, hashtags..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input" /></form>
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><Home size={22}/></Link>
        <Link to="/messages" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><MessageCircle size={22}/><Badge count={messageCount}/></Link>
        <Link to="/notifications" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><Bell size={22}/><Badge count={notificationCount}/></Link>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">{theme === 'dark' ? <Sun size={22}/> : <Moon size={22}/>}</button>
        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)}><img src={mediaUrl(user?.profile_picture) || '/default-avatar.svg'} className="w-8 h-8 rounded-full object-cover" alt="" /></button>
          {menuOpen && <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border py-2 z-50">
            <Link to={`/profile/${user?.username}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"><User size={16}/> Profile</Link>
            {user?.role !== 'user' && <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"><Shield size={16}/> Admin</Link>}
            <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Settings</Link>
            <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"><LogOut size={16}/> Logout</button>
          </div>}
        </div>
      </div>
    </div>
  </nav>;
}
