import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const referral = new URLSearchParams(window.location.search).get('ref');
  const registerPath = referral ? `/register?ref=${encodeURIComponent(referral)}` : '/register';

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username" className="input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required autoComplete="username" />
          <input type="password" placeholder="Password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">Don't have an account? <Link to={registerPath} className="text-blue-600 hover:underline">Sign up</Link></p>
      </div>
    </div>
  );
}