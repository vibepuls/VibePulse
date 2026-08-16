import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Flag, Activity, Ban, Trash2, CheckCircle } from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    api.get('/admin/dashboard').then(res => setStats(res.data));
    fetchUsers();
    fetchReports();
  }, []);

  const fetchUsers = () => {
    api.get(`/admin/users?search=${userSearch}`).then(res => setUsers(res.data.users));
  };

  const fetchReports = () => {
    api.get('/admin/reports').then(res => setReports(res.data));
  };

  const handleSuspend = async (id) => {
    await api.post(`/admin/users/${id}/suspend`);
    fetchUsers();
  };

  const handleUnsuspend = async (id) => {
    await api.post(`/admin/users/${id}/unsuspend`);
    fetchUsers();
  };

  const handleResolveReport = async (id) => {
    await api.patch(`/admin/reports/${id}`, { status: 'resolved' });
    fetchReports();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4"><Users className="text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats.users || 0}</p><p className="text-sm text-gray-500">Total Users</p></div>
        <div className="card p-4"><FileText className="text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.posts || 0}</p><p className="text-sm text-gray-500">Total Posts</p></div>
        <div className="card p-4"><Flag className="text-red-600 mb-2" /><p className="text-2xl font-bold">{stats.reports || 0}</p><p className="text-sm text-gray-500">Pending Reports</p></div>
        <div className="card p-4"><Activity className="text-purple-600 mb-2" /><p className="text-2xl font-bold">{stats.activeToday || 0}</p><p className="text-sm text-gray-500">Active Today</p></div>
      </div>

      <div className="flex gap-2 mb-4">
        {['overview', 'users', 'reports'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <input type="text" placeholder="Search users..." value={userSearch} onChange={e => { setUserSearch(e.target.value); fetchUsers(); }} className="input max-w-sm" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="text-left p-3">User</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="p-3"><Link to={`/profile/${u.username}`} className="flex items-center gap-2"><img src={u.profile_picture || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full" /><div><p className="font-medium">{u.full_name}</p><p className="text-xs text-gray-500">@{u.username}</p></div></Link></td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">{u.is_suspended ? <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded-full">Suspended</span> : <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">Active</span>}</td>
                  <td className="p-3">
                    {u.is_suspended 
                      ? <button onClick={() => handleUnsuspend(u.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle size={16} /></button>
                      : <button onClick={() => handleSuspend(u.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Ban size={16} /></button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Reported: @{r.reported_username}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{r.status}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Reason: {r.reason}</p>
              <p className="text-sm mb-2">{r.description}</p>
              {r.status === 'pending' && (
                <button onClick={() => handleResolveReport(r.id)} className="text-sm text-blue-600 hover:underline">Mark as Resolved</button>
              )}
            </div>
          ))}
          {reports.length === 0 && <div className="text-center py-8 text-gray-500">No reports</div>}
        </div>
      )}
    </div>
  );
}