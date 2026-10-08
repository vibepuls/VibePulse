import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(''); setResetUrl(''); setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'If the account exists, a reset email has been sent.');
      if (res.data.resetUrl) setResetUrl(res.data.resetUrl);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not request password reset.');
    } finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-center justify-center p-4">
    <div className="card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Forgot password?</h1>
      <p className="text-center text-sm text-gray-500 mb-6">Enter your email and we will send a reset link.</p>
      {message && <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 p-3 rounded-lg mb-4 text-sm">{message}</div>}
      {resetUrl && <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4 text-sm break-all"><strong>Development reset link:</strong><br />{resetUrl}</div>}
      <form onSubmit={submit} className="space-y-4">
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
      </form>
      <p className="text-center mt-4 text-sm"><Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link></p>
    </div>
  </div>;
}
