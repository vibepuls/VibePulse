import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SocialGamingApp from './pages/SocialGamingApp';
import GuestBrowse from './pages/GuestBrowse';
import AdminDashboard from './admin/AdminDashboard';
import SeoManager from './SeoManager';
import PublicProfile from './pages/PublicProfile';
import ProfessionalVideoEditor from './pages/ProfessionalVideoEditor';
import TemplatesPage from './pages/TemplatesPage';
import TemplateVideoMaker from './pages/TemplateVideoMaker';

export default function App() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Loading VibePulse…</div>;
  }

  const canAccessAdmin = ['admin', 'super_admin', 'moderator', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user?.role);

  return (
    <>
    <SeoManager />
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/admin" element={isAuthenticated && canAccessAdmin ? <AdminDashboard /> : <Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      <Route path="/cinematic" element={isAuthenticated ? <ProfessionalVideoEditor /> : <Navigate to="/login" replace />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/template-studio" element={<TemplateVideoMaker />} />
      <Route path="/profile/:username" element={isAuthenticated ? <SocialGamingApp /> : <PublicProfile />} />
      <Route path="/*" element={isAuthenticated ? <SocialGamingApp /> : <GuestBrowse />} />
    </Routes>
    </>
  );
}
