import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { X, MessageCircle, Bell } from 'lucide-react';
import io from 'socket.io-client';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Bookmarks from './pages/Bookmarks';
import Settings from './pages/Settings';
import AdminDashboard from './admin/AdminDashboard';
import PostDetail from './pages/PostDetail';
import Search from './pages/Search';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://vibepulse-backend-boxi.onrender.com/api').replace(/\/api\/?$/, '');

function MessageToast({ message, onClose, onOpen }) {
  if (!message) return null;
  const senderName = message.full_name || message.username || 'Someone';
  const preview = message.content || (message.message_type === 'image' ? '📷 Sent an image' : message.message_type === 'video' ? '🎥 Sent a video' : 'New message');
  return (
    <div className="fixed top-20 right-4 z-[100] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
      <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
        <X size={18} />
      </button>
      <button onClick={onOpen} className="w-full text-left p-4 pr-10 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-750">
        <img src={message.profile_picture || '/default-avatar.svg'} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold"><MessageCircle size={17} className="text-blue-600" /> New message</div>
          <p className="mt-1 font-medium truncate">{senderName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{preview}</p>
        </div>
      </button>
    </div>
  );
}


function NotificationToast({ notification, onClose, onOpen }) {
  if (!notification) return null;
  return <div className="fixed top-20 right-4 z-[99] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
    <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full text-gray-500 hover:bg-gray-100"><X size={18}/></button>
    <button onClick={onOpen} className="w-full text-left p-4 pr-10 hover:bg-gray-50 dark:hover:bg-gray-700"><div className="flex items-center gap-2 font-semibold"><Bell size={17} className="text-blue-600"/> New notification</div><p className="mt-1 text-sm">{notification.message}</p></button>
  </div>;
}

function GlobalNotificationListener({ user }) {
  const navigate = useNavigate(); const [notification, setNotification] = useState(null); const timerRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem('token'); if (!user || !token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket','polling'] });
    const handler = n => { setNotification(n); window.dispatchEvent(new Event('vibepulse:counts-refresh')); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setNotification(null), 7000); };
    socket.on('new_notification', handler); return () => { socket.off('new_notification', handler); socket.disconnect(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [user]);
  return <NotificationToast notification={notification} onClose={() => setNotification(null)} onOpen={() => { if (!notification) return; const id = notification.reference_id; setNotification(null); navigate(notification.reference_type === 'user' && id ? `/profile/${id}` : id ? `/post/${id}` : '/notifications'); }} />;
}

function GlobalMessageListener({ user }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const handleNewMessage = (incoming) => {
      if (String(incoming.sender_id) === String(user.id)) return;
      setMessage(incoming);
      window.dispatchEvent(new Event('vibepulse:counts-refresh'));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMessage(null), 7000);
    };
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  const close = () => setMessage(null);
  const open = () => {
    if (!message) return;
    const id = message.conversation_id;
    setMessage(null);
    navigate(`/messages/${id}`);
  };

  return <MessageToast message={message} onClose={close} onOpen={open} />;
}

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isAuthenticated && <><GlobalMessageListener user={user} /><GlobalNotificationListener user={user} /></>}
      {isAuthenticated && <Navbar />}
      <div className="max-w-7xl mx-auto flex pt-16">
        {isAuthenticated && (
          <aside className="hidden lg:block w-64 fixed h-full overflow-y-auto p-4">
            <Sidebar />
          </aside>
        )}
        <main className={`flex-1 ${isAuthenticated ? 'lg:ml-64 lg:mr-80' : ''} p-4`}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Home /> : <Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/admin" element={user?.role !== 'user' ? <AdminDashboard /> : <Home />} />
          </Routes>
        </main>
        {isAuthenticated && (
          <aside className="hidden lg:block w-80 fixed right-0 h-full overflow-y-auto p-4">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;