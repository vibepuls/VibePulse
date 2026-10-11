import { avatarUrl } from '../services/media';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Flag, Activity, Ban, CheckCircle, LayoutDashboard, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'reports', label: 'Reports', icon: Flag },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [reportFilter, setReportFilter] = useState('pending');
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users?limit=50'),
        api.get('/admin/reports?status=pending&limit=50'),
      ]);
      setStats(statsRes.data || {});
      setUsers(usersRes.data?.users || []);
      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
    } catch (err) {
      setError(err.response?.status === 403
        ? 'এই অ্যাকাউন্টে Admin অনুমতি নেই।'
        : err.response?.data?.error || 'Admin data লোড করা যায়নি। Backend connection পরীক্ষা করুন।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (activeTab !== 'users') return;
      try {
        const res = await api.get('/admin/users', { params: { search: userSearch, limit: 50 } });
        setUsers(res.data?.users || []);
      } catch (err) {
        setError(err.response?.data?.error || 'User list লোড করা যায়নি।');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearch, activeTab]);

  const runUserAction = async (user, action) => {
    setBusyId(user.id);
    setError('');
    setNotice('');
    try {
      await api.post(`/admin/users/${user.id}/${action}`);
      setNotice(action === 'suspend' ? 'User suspended হয়েছে।' : 'User আবার active হয়েছে।');
      const res = await api.get('/admin/users', { params: { search: userSearch, limit: 50 } });
      setUsers(res.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Action সম্পন্ন হয়নি।');
    } finally {
      setBusyId(null);
    }
  };

  const loadReports = async (status = reportFilter) => {
    try {
      const res = await api.get('/admin/reports', { params: { status: status || undefined, limit: 50 } });
      setReports(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Reports লোড করা যায়নি।');
    }
  };

  const resolveReport = async (report, status) => {
    setBusyId(report.id);
    setError('');
    setNotice('');
    try {
      await api.patch(`/admin/reports/${report.id}`, { status });
      setReports((current) => current.filter((item) => item.id !== report.id));
      setNotice(status === 'resolved' ? 'Report resolved হয়েছে।' : 'Report dismissed হয়েছে।');
      loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Report update করা যায়নি।');
    } finally {
      setBusyId(null);
    }
  };

  const cards = [
    { label: 'Total users', value: stats.users ?? '—', icon: Users, color: 'blue' },
    { label: 'Total posts', value: stats.posts ?? '—', icon: FileText, color: 'violet' },
    { label: 'Pending reports', value: stats.reports ?? reports.length, icon: Flag, color: 'rose' },
    { label: 'Active in 24 hours', value: stats.activeToday ?? '—', icon: Activity, color: 'emerald' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:flex">
      <aside className="w-full border-b border-white/10 bg-slate-900 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <Link to="/" className="mb-7 flex items-center gap-3 px-2 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600"><ShieldCheck size={22} /></span>
          <span><strong className="block text-lg">VibePulse</strong><span className="text-xs text-slate-400">Admin Center</span></span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}>
              <Icon size={18} />{label}
              {id === 'reports' && reports.length > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs">{reports.length}</span>}
            </button>
          ))}
        </nav>
        <Link to="/" className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">← Back to VibePulse</Link>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Control panel</p><h1 className="text-3xl font-bold">{tabs.find((tab) => tab.id === activeTab)?.label}</h1><p className="mt-2 text-sm text-slate-400">Manage community activity, accounts and reports.</p></div>
          <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}

        {activeTab === 'overview' && <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-lg shadow-black/10">
              <div className="mb-5 flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><span className={`grid h-10 w-10 place-items-center rounded-xl bg-${color}-500/10 text-${color}-300`}><Icon size={20} /></span></div>
              <p className="text-3xl font-bold">{loading ? '…' : value}</p>
            </div>)}
          </section>
          <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Reports needing attention</h2><p className="text-sm text-slate-400">Review pending community reports.</p></div><button onClick={() => setActiveTab('reports')} className="text-sm font-medium text-blue-400 hover:text-blue-300">View all →</button></div>
            {reports.slice(0, 5).map((report) => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 py-3"><div><p className="text-sm font-medium">Reported: @{report.reported_username || 'user'}</p><p className="mt-1 text-xs text-slate-400">{report.reason || 'No reason provided'}</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">{report.status || 'pending'}</span></div>)}
            {!loading && reports.length === 0 && <p className="py-6 text-sm text-slate-400">No pending reports. You’re all caught up.</p>}
          </section>
        </>}

        {activeTab === 'users' && <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-semibold">Community users</h2><p className="text-xs text-slate-400">Suspend or restore accounts when necessary.</p></div><label className="flex min-w-56 items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2"><Search size={16} className="text-slate-400" /><input aria-label="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search username or name" className="w-full bg-transparent text-sm outline-none" /></label></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-xs uppercase text-slate-400"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>
            {users.map((user) => <tr key={user.id} className="border-t border-white/5"><td className="p-4"><Link to={`/profile/${user.username}`} className="flex items-center gap-3"><img src={avatarUrl(user.profile_picture)} alt="" className="h-9 w-9 rounded-full bg-slate-800 object-cover" /><span><strong className="block">{user.full_name || user.username}</strong><span className="text-xs text-slate-400">@{user.username}</span></span></Link></td><td className="p-4 capitalize text-slate-300">{user.role || 'user'}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs ${user.is_suspended ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{user.is_suspended ? 'Suspended' : 'Active'}</span></td><td className="p-4">{user.role === 'super_admin' ? <span className="text-xs text-slate-500">Protected</span> : <button disabled={busyId === user.id} onClick={() => runUserAction(user, user.is_suspended ? 'unsuspend' : 'suspend')} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${user.is_suspended ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{busyId === user.id ? 'Please wait…' : user.is_suspended ? <><CheckCircle size={14} className="mr-1 inline" />Restore</> : <><Ban size={14} className="mr-1 inline" />Suspend</>}</button>}</td></tr>)}
          </tbody></table></div>
          {!loading && users.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No users found.</p>}
        </section>}

        {activeTab === 'reports' && <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900 p-5"><div><h2 className="font-semibold">Content and account reports</h2><p className="mt-1 text-sm text-slate-400">Review each report and record a moderation decision.</p></div><label className="flex items-center gap-2 text-sm text-slate-300">Status<select aria-label="Filter reports by status" value={reportFilter} onChange={(e) => { setReportFilter(e.target.value); loadReports(e.target.value); }} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="">All reports</option></select></label></div>
          {reports.map((report) => <article key={report.id} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Reported: @{report.reported_username || 'user'}</p><p className="mt-1 text-xs text-slate-400">Reason: {report.reason || 'Not specified'}</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">{report.status || 'pending'}</span></div>{report.description && <p className="mt-3 text-sm text-slate-300">{report.description}</p>}{report.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busyId === report.id} onClick={() => resolveReport(report, 'resolved')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">{busyId === report.id ? 'Please wait…' : 'Resolve report'}</button><button disabled={busyId === report.id} onClick={() => resolveReport(report, 'dismissed')} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50">Dismiss report</button></div>}</article>)}
          {!loading && reports.length === 0 && <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center text-sm text-slate-400">No pending reports.</div>}
        </section>}
      </main>
    </div>
  );
}
