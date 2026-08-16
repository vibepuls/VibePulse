import { Routes, Route } from 'react-router-dom';
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

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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