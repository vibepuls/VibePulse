import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Search, Compass, MessageCircle, Bell, Bookmark, User, Settings, Shield } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { to: `/profile/${user?.username}`, icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="space-y-2">
      {links.map(link => (
        <Link key={link.to} to={link.to}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${location.pathname === link.to ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          <link.icon size={22} />
          <span>{link.label}</span>
        </Link>
      ))}
      {user?.role !== 'user' && (
        <Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${location.pathname === '/admin' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          <Shield size={22} />
          <span>Admin</span>
        </Link>
      )}
    </div>
  );
}