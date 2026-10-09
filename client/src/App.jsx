import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SocialGamingApp from './pages/SocialGamingApp';

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Loading VibePulse…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/profile/:username" element={isAuthenticated ? <SocialGamingApp /> : <Login />} />
      <Route path="/*" element={isAuthenticated ? <SocialGamingApp /> : <Login />} />
    </Routes>
  );
}
