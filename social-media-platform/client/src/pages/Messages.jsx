import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Send, Image, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import io from 'socket.io-client';
import { mediaUrl } from '../services/media';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://vibepulse-backend-boxi.onrender.com/api').replace(/\/api\/?$/, '');

export default function Messages() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInput = useRef();

  const addMessageIfNew = useCallback((message) => {
    setMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message]);
  }, []);

  const loadConversations = useCallback(async () => {
    const res = await api.get('/messages/conversations');
    setConversations(res.data);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadConversations()
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadConversations]);

  useEffect(() => {
    if (!conversationId || !socket) return undefined;

    let cancelled = false;
    socket.emit('join_conversation', conversationId);

    api.get(`/messages/conversations/${conversationId}`)
      .then(res => { if (!cancelled) { setMessages(res.data); res.data.filter(m => String(m.sender_id) !== String(user?.id)).forEach(m => api.post(`/messages/messages/${m.id}/read`).catch(() => {})); } })
      .catch(() => { if (!cancelled) setMessages([]); });

    const handleNewMessage = (msg) => {
      if (String(msg.conversation_id) === String(conversationId)) {
        addMessageIfNew(msg);
        if (String(msg.sender_id) !== String(user?.id)) api.post(`/messages/messages/${msg.id}/read`).catch(() => {});
      }
      loadConversations().catch(() => {});
    };

    const handleTyping = ({ conversationId: id, isTyping }) => {
      if (String(id) === String(conversationId)) setTyping(isTyping);
    };

    const handleConversationUpdated = () => {
      loadConversations().catch(() => {});
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      cancelled = true;
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [conversationId, socket, addMessageIfNew, loadConversations, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !conversationId) return;

    try {
      const res = await api.post(`/messages/conversations/${conversationId}`, { content });
      // Socket.IO normally delivers this back to the sender. This fallback
      // keeps the UI responsive if the socket reconnects while sending.
      addMessageIfNew(res.data);
      setNewMessage('');
      socket?.emit('typing', { conversationId, isTyping: false });
      loadConversations().catch(() => {});
    } catch {}
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket?.emit('typing', { conversationId, isTyping: e.target.value.length > 0 });
  };

  const handleMedia = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conversationId) return;

    const formData = new FormData();
    formData.append('media', file);
    try {
      const res = await api.post(`/messages/conversations/${conversationId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addMessageIfNew(res.data);
      loadConversations().catch(() => {});
    } catch {}
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <div className={`w-full md:w-80 card overflow-y-auto ${conversationId ? 'hidden md:block' : ''}`}>
        <h2 className="font-bold text-lg p-4 border-b border-gray-200 dark:border-gray-700">Messages</h2>
        {conversations.map(conv => (
          <Link
            key={conv.id}
            to={`/messages/${conv.id}`}
            className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 ${String(conversationId) === String(conv.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          >
            <img src={conv.participants?.find(p => p.id !== user?.id)?.profile_picture || '/default-avatar.svg'} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{conv.title || conv.participants?.find(p => p.id !== user?.id)?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages yet'}</p>
            </div>
            {conv.unread_count > 0 && <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{conv.unread_count}</span>}
          </Link>
        ))}
        {conversations.length === 0 && (
          <div className="p-4 text-gray-500 text-sm">
            No conversations yet. Open a user's profile and press the message button to start a chat.
          </div>
        )}
      </div>

      {conversationId ? (
        <div className="flex-1 card flex flex-col min-w-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <Link to="/messages" className="md:hidden"><ArrowLeft size={20} /></Link>
            <span className="font-medium">Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${String(msg.sender_id) === String(user?.id) ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${String(msg.sender_id) === String(user?.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {msg.media_url && msg.message_type === 'image' && <img src={mediaUrl(msg.media_url)} alt="" className="rounded-lg mb-2 max-w-full" />}
                  {msg.media_url && msg.message_type === 'video' && <video src={mediaUrl(msg.media_url)} controls className="rounded-lg mb-2 max-w-full" />}
                  {msg.content && <p>{msg.content}</p>}
                  <p className={`text-xs mt-1 ${String(msg.sender_id) === String(user?.id) ? 'text-blue-200' : 'text-gray-500'}`}>
                    {formatDistanceToNow(new Date(msg.created_at))} ago {msg.is_edited ? '· edited' : ''}
                  </p>
                </div>
              </div>
            ))}
            {typing && <div className="text-sm text-gray-500">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button type="button" onClick={() => fileInput.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Send image or video">
              <Image size={20} />
            </button>
            <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={handleMedia} />
            <input type="text" placeholder="Type a message..." className="input flex-1" value={newMessage} onChange={handleTyping} />
            <button type="submit" className="btn-primary" disabled={!newMessage.trim()}><Send size={18} /></button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 card items-center justify-center text-gray-500">
          Select a conversation to start messaging
        </div>
      )}
    </div>
  );
}
