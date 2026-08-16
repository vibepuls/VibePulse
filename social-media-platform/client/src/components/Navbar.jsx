import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Home, Search, MessageCircle, Bell, Menu, Sun, Moon, LogOut, User, Shield } from 'lucide-react';
import api from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">SocialApp</Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="input" />
        </form>

        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><Home size={22} /></Link>
          <Link to="/messages" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><MessageCircle size={22} /></Link>
          <Link to="/notifications" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><Bell size={22} /></Link>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
              <img src={user?.profile_picture || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full object-cover" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                <Link to={`/profile/${user?.username}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setMenuOpen(false)}>
                  <User size={16} /> Profile
                </Link>
                {user?.role !== 'user' && (
                  <Link to="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setMenuOpen(false)}>
                    <Shield size={16} /> Admin
                  </Link>
                )}
                <Link to="/settings" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-red-600">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}