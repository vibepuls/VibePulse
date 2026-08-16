import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Share2, AtSign, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

const icons = { follow: UserPlus, like: Heart, comment: MessageCircle, share: Share2, mention: AtSign };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(res => { setNotifications(res.data); setLoading(false); });
    api.patch('/notifications/read-all');
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={() => api.patch('/notifications/read-all').then(() => setNotifications(prev => prev.map(n => ({...n, is_read: true}))))} className="text-sm text-blue-600 hover:underline">Mark all as read</button>
      </div>
      {notifications.length === 0 ? <div className="text-center py-8 text-gray-500">No notifications yet</div> : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = icons[n.type] || Bell;
            return (
              <Link key={n.id} to={n.reference_id ? `/post/${n.reference_id}` : `/profile/${n.sender_username}`} className={`card p-4 flex items-center gap-3 ${!n.is_read ? 'border-l-4 border-l-blue-600' : ''}`}>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full"><Icon size={18} className="text-blue-600" /></div>
                <img src={n.sender_picture || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1"><p className="text-sm">{n.message}</p><p className="text-xs text-gray-500">{formatDistanceToNow(new Date(n.created_at))} ago</p></div>
                {!n.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}