import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../api/http';
import { useAuth } from '../context/AuthContext';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import StudentsManage from '../components/admin/StudentsManage';
import PrincipalFacultyManage from '../components/admin/PrincipalFacultyManage';
import NotificationBell from '../components/NotificationBell';
import { BarChart3, LogOut, Menu, X, FileCheck2, Check, XCircle, Users, GraduationCap } from 'lucide-react';

function PrincipalDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overall View', icon: BarChart3 },
    { id: 'students', label: 'Student Directory', icon: Users },
    { id: 'faculty', label: 'Advisor & HOD Directory', icon: GraduationCap },
  ];

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const fetchPendingLeaves = async () => {
    try {
      setLoadingLeaves(true);
      const res = await axios.get(apiUrl('/api/requests?approvalStage=Principal&status=Pending'), {
        headers: withAuthHeader()
      });
      setPendingLeaves((res.data.requests || []).filter(r => r.targetModel === 'Leave'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleReview = async (requestId, status) => {
    const remarks = prompt(`Enter remarks for ${status.toLowerCase()}:`);
    if (remarks === null) return;
    try {
      await axios.put(apiUrl(`/api/requests/${requestId}/review`), { status, reviewRemarks: remarks }, {
        headers: withAuthHeader()
      });
      fetchPendingLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

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
              <p className="text-[10px] text-amber-600 font-extrabold uppercase">Principal Portal</p>
            </div>
          </div>
          <button className="lg:hidden p-1.5 bg-slate-50 border rounded-lg" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-sm ${
                  isActive 
                    ? 'bg-amber-50 text-amber-700 border border-amber-100 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-55 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-6 border-t">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 font-bold py-3 rounded-xl text-sm">
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
            <h2 className="text-lg md:text-2xl font-extrabold text-slate-800">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{user?.name || 'Principal'}</p>
              <p className="text-[10px] text-amber-600 font-bold uppercase">Principal</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 pb-20 md:p-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto pb-10">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {pendingLeaves.length > 0 && (
                  <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b bg-amber-50/50 flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-amber-600" />
                      <h3 className="font-extrabold text-slate-800">Leave Requests Awaiting Principal Approval ({pendingLeaves.length})</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {pendingLeaves.map(req => (
                        <div key={req._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-800">{req.requestedBy?.name}</p>
                            <p className="text-xs text-slate-505">{req.newValue?.leaveType} Leave: {req.reason}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {req.newValue?.startDate ? new Date(req.newValue.startDate).toLocaleDateString() : ''} — {req.newValue?.endDate ? new Date(req.newValue.endDate).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleReview(req._id, 'Approved')} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => handleReview(req._id, 'Rejected')} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {loadingLeaves && pendingLeaves.length === 0 && (
                  <p className="text-xs text-slate-400 font-bold text-center">Checking for pending leave approvals...</p>
                )}
                <AnalyticsDashboard />
              </div>
            )}

            {activeTab === 'students' && (
              <StudentsManage isReadOnly={true} />
            )}

            {activeTab === 'faculty' && (
              <PrincipalFacultyManage />
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar for Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-150 py-2 px-4 flex items-center justify-around z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-colors duration-200 ${
                  isActive ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600 scale-105' : 'text-slate-400'}`} />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default PrincipalDashboard;
