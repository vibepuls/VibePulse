import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Send, Image, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import io from 'socket.io-client';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const s = io(import.meta.env.VITE_API_URL?.replace('/api', '') || '', { auth: { token } });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    api.get('/messages/conversations').then(res => { setConversations(res.data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (conversationId && socket) {
      socket.emit('join_conversation', conversationId);
      api.get(`/messages/conversations/${conversationId}`).then(res => setMessages(res.data));

      socket.on('new_message', (msg) => {
        if (msg.conversation_id === conversationId) setMessages(prev => [...prev, msg]);
      });
      socket.on('typing', ({ isTyping }) => setTyping(isTyping));

      return () => {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_message');
        socket.off('typing');
      };
    }
  }, [conversationId, socket]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await api.post(`/messages/conversations/${conversationId}`, { content: newMessage });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      socket?.emit('typing', { conversationId, isTyping: false });
    } catch {}
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket?.emit('typing', { conversationId, isTyping: e.target.value.length > 0 });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <div className={`w-full md:w-80 card overflow-y-auto ${conversationId ? 'hidden md:block' : ''}`}>
        <h2 className="font-bold text-lg p-4 border-b border-gray-200 dark:border-gray-700">Messages</h2>
        {conversations.map(conv => (
          <Link key={conv.id} to={`/messages/${conv.id}`} className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 ${conversationId === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <img src={conv.participants?.find(p => p.id !== user?.id)?.profile_picture || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{conv.title || conv.participants?.find(p => p.id !== user?.id)?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages yet'}</p>
            </div>
            {conv.unread_count > 0 && <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{conv.unread_count}</span>}
          </Link>
        ))}
        {conversations.length === 0 && <div className="p-4 text-gray-500 text-sm">No conversations yet</div>}
      </div>

      {conversationId ? (
        <div className="flex-1 card flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <Link to="/messages" className="md:hidden"><ArrowLeft size={20} /></Link>
            <span className="font-medium">Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.sender_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {msg.media_url && msg.message_type === 'image' && <img src={msg.media_url} alt="" className="rounded-lg mb-2 max-w-full" />}
                  {msg.media_url && msg.message_type === 'video' && <video src={msg.media_url} controls className="rounded-lg mb-2 max-w-full" />}
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-blue-200' : 'text-gray-500'}`}>{formatDistanceToNow(new Date(msg.created_at))} ago</p>
                </div>
              </div>
            ))}
            {typing && <div className="text-sm text-gray-500">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button type="button" onClick={() => fileInput.current.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><Image size={20} /></button>
            <input ref={fileInput} type="file" className="hidden" onChange={async (e) => {
              if (!e.target.files[0]) return;
              const formData = new FormData();
              formData.append('media', e.target.files[0]);
              try { const res = await api.post(`/messages/conversations/${conversationId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setMessages(prev => [...prev, res.data]); } catch {}
            }} />
            <input type="text" placeholder="Type a message..." className="input flex-1" value={newMessage} onChange={handleTyping} />
            <button type="submit" className="btn-primary"><Send size={18} /></button>
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