import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Share2, AtSign, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { mediaUrl } from '../services/media';

const icons = { follow: UserPlus, follow_request: UserPlus, like: Heart, comment: MessageCircle, reply: MessageCircle, share: Share2, mention: AtSign, message: MessageCircle };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { try { const res = await api.get('/notifications'); setNotifications(res.data); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => { try { await api.patch(`/notifications/${id}/read`); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); window.dispatchEvent(new Event('vibepulse:counts-refresh')); } catch {} };
  const markAll = async () => { try { await api.patch('/notifications/read-all'); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); window.dispatchEvent(new Event('vibepulse:counts-refresh')); } catch {} };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  return <div>
    <div className="flex items-center justify-between mb-4"><h1 className="text-2xl font-bold">Notifications</h1><button onClick={markAll} className="text-sm text-blue-600 hover:underline">Mark all as read</button></div>
    {notifications.length === 0 ? <div className="text-center py-8 text-gray-500">No notifications yet</div> : <div className="space-y-2">{notifications.map(n => {
      const Icon = icons[n.type] || Bell;
      const target = n.type === 'message' ? `/messages/${n.reference_id}` : n.reference_type === 'comment' ? `/post/${n.reference_id}` : n.reference_id ? `/post/${n.reference_id}` : `/profile/${n.sender_username}`;
      return <Link key={n.id} to={target} onClick={() => markRead(n.id)} className={`card p-4 flex items-center gap-3 ${!n.is_read ? 'border-l-4 border-l-blue-600' : ''}`}>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full"><Icon size={18} className="text-blue-600"/></div>
        <img src={mediaUrl(n.sender_picture) || '/default-avatar.svg'} className="w-10 h-10 rounded-full object-cover" alt=""/>
        <div className="flex-1"><p className="text-sm">{n.message}</p><p className="text-xs text-gray-500">{formatDistanceToNow(new Date(n.created_at))} ago</p></div>
        {!n.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full"/>}
      </Link>;
    })}</div>}
  </div>;
}
