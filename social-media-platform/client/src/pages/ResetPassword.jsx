import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token') || '';

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!token) return setError('Reset token is missing.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      alert('Password reset successfully. Please sign in.');
      navigate('/login');
    } catch (err) { setError(err.response?.data?.error || 'Could not reset password.'); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-center justify-center p-4">
    <div className="card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Create a new password</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <input className="input" type="password" minLength={8} placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required />
        <input className="input" type="password" minLength={8} placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
      </form>
      <p className="text-center mt-4 text-sm"><Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link></p>
    </div>
  </div>;
}
