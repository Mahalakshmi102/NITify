import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../api/http';
import { useAuth } from '../context/AuthContext';
import AdvisorDashboardView from '../components/faculty/AdvisorDashboardView';
import NotificationBell from '../components/NotificationBell';
import { Shield, LogOut, Menu, X, History } from 'lucide-react';

function ClassAdvisorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(apiUrl('/api/auth/profile'), { headers: withAuthHeader() });
      setFaculty(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Advisor Console', icon: Shield },
    { id: 'attendance-history', label: 'Attendance History', icon: History }
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans flex overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col z-30 transition-transform duration-300 transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="NIT Logo" className="w-10 h-10 rounded-full border border-slate-200" />
            <div>
              <h1 className="text-lg font-black text-slate-800">NITify</h1>
              <p className="text-[10px] text-indigo-600 font-extrabold uppercase">Class Advisor</p>
            </div>
          </div>
          <button className="lg:hidden p-1.5 bg-slate-50 border rounded-lg" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Main Modules</p>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id || (item.id === 'overview' && activeSubTab !== 'attendance-history');
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSubTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-sm ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-6 border-t">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 font-bold py-3 rounded-xl text-sm hover:bg-rose-50 transition">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 bg-slate-50 border rounded-xl" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg md:text-2xl font-extrabold text-slate-800">Class Advisor Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{user?.name}</p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase">Class Advisor</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto pb-10">
            {loading ? (
              <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Loading advisor console...</div>
            ) : (
              <AdvisorDashboardView 
                faculty={faculty} 
                activeSubTab={activeSubTab} 
                setActiveSubTab={setActiveSubTab} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ClassAdvisorDashboard;
