import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Shield, Search,
  TrendingUp, UserCog, Calendar, Eye, RefreshCw, CheckSquare, FileCheck2, Check, X, AlertTriangle, History
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import StudentDetailsView from '../admin/StudentDetailsView';
import StudentModal from '../admin/StudentModal';
import AttendanceMonitoring from '../admin/AttendanceMonitoring';
import AttendanceHistoryView from './AttendanceHistoryView';

export default function AdvisorDashboardView({ 
  faculty, 
  defaultSubTab = 'overview', 
  activeSubTab: propActiveSubTab, 
  setActiveSubTab: propSetActiveSubTab 
}) {
  const { user } = useAuth();
  const [localActiveSubTab, setLocalActiveSubTab] = useState(defaultSubTab);
  
  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : localActiveSubTab;
  const setActiveSubTab = propSetActiveSubTab !== undefined ? propSetActiveSubTab : setLocalActiveSubTab;
  
  // Roster, stats and details
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Local Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Student Modal Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [faculty]);

  useEffect(() => {
    if (activeSubTab === 'calendar') {
      fetchCalendar();
    }
  }, [activeSubTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      let queryStr = '';
      if (faculty?.classAdvisorDetails) {
        const adv = faculty.classAdvisorDetails;
        queryStr = `?department=${adv.department}&year=${adv.year}&semester=${adv.semester}&section=${adv.section}`;
      }
      const res = await axios.get(apiUrl(`/api/admin/advisor/stats${queryStr}`), {
        headers: withAuthHeader()
      });
      setStatsData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch advisor statistics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      setLoadingCalendar(true);
      const res = await axios.get(apiUrl('/api/admin/calendar'), {
        headers: withAuthHeader()
      });
      setCalendarEvents(res.data || []);
    } catch (err) {
      console.error('Failed to load academic calendar:', err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // CSV Export
  const handleExportRoster = () => {
    if (!statsData?.students) return;
    const csvRows = [
      ['S.No', 'RegisterNumber', 'Name', 'Batch', 'Year', 'Semester', 'Section', 'Mobile No', 'Parent No', 'Attendance %', 'Status']
    ];

    statsData.students.forEach((s, idx) => {
      csvRows.push([
        idx + 1,
        s.registerNumber || '',
        s.name || '',
        s.batch || '',
        s.year || '',
        s.semester || '',
        s.section || '',
        s.mobile || '',
        s.parentMobile || '',
        `${s.attendancePercentage}%`,
        s.category || 'Normal'
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `advised_class_directory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-bold">Compiling advised class statistics & directories...</p>
      </div>
    );
  }

  if (error || !statsData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-center max-w-xl mx-auto my-10 p-8 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-rose-800">Error Accessing Advisor Dashboard</h3>
        <p className="text-rose-600 font-semibold mt-2">{error || 'Class Advisor Details are missing or invalid.'}</p>
      </div>
    );
  }

  const { classDetails, statistics, defaulters, atRisk, topPerforming, attendanceTrends } = statsData;

  // Compile full roster list from statsData.students
  const fullRoster = statsData.students || [];

  // Local filtering
  const filteredRoster = fullRoster.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
      (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q));
  });

  // Recharts attendance trends formatting
  const chartData = attendanceTrends.map(t => {
    const d = new Date(t.date);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      name: dateFormatted,
      'Attendance %': t.percentage
    };
  });

  // If student profile details is active
  if (selectedStudentId) {
    // Security check: ensure advisor is only opening a student from their own roster
    const belongsToAdvisorClass = fullRoster.some(s => s._id.toString() === selectedStudentId.toString());
    if (!belongsToAdvisorClass) {
      return (
        <div className="bg-rose-50 border border-rose-200 text-center max-w-xl mx-auto my-10 p-8 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
          <p className="text-rose-600 font-semibold mt-2">You are not authorized to view student details outside your assigned class.</p>
          <button onClick={() => setSelectedStudentId(null)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Back</button>
        </div>
      );
    }

    return (
      <StudentDetailsView 
        studentId={selectedStudentId} 
        onBack={() => setSelectedStudentId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Advisor Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Advised Class Monitor</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Class Advisor Dashboard</h2>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Section: {classDetails.department} - Year {classDetails.year} | Sem {classDetails.semester} | Sec {classDetails.section}
          </p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === 'students' && (
            <button 
              onClick={handleExportRoster}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition shadow-lg backdrop-blur-sm text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Class Roster
            </button>
          )}
          <button 
            onClick={fetchStats}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 hover:bg-slate-50 font-bold rounded-xl transition shadow-lg text-sm"
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-6 py-1.5 rounded-2xl shadow-sm flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Class Overview', icon: TrendingUp },
          { id: 'mark-attendance', label: 'Mark Daily Attendance', icon: CheckSquare },
          { id: 'submission-status', label: 'Attendance Submission Status', icon: FileCheck2 },
          { id: 'students', label: 'Students Directory', icon: Users },
          { id: 'attendance-history', label: 'Attendance History', icon: History },
          { id: 'calendar', label: 'Academic Calendar', icon: Calendar }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition text-xs ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW & TRENDS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Students</span>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{statistics.totalStudents}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Enrolled</p>
              </div>
            </div>

            {/* Attendance % */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Class Attendance</span>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{statistics.classAttendancePercentage}%</p>
                <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Average rate</p>
              </div>
            </div>

            {/* Defaulters Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-rose-50 p-3 rounded-xl text-rose-600"><XCircle className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Defaulters (&lt;75%)</span>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{statistics.defaultersCount}</p>
                <p className="text-[10px] font-semibold text-rose-500 mt-0.5">Critical list</p>
              </div>
            </div>

            {/* At-Risk Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">At Risk (75%-80%)</span>
                <p className="text-2xl font-black text-amber-600 mt-0.5">{statistics.atRiskCount}</p>
                <p className="text-[10px] font-semibold text-amber-500 mt-0.5">Warning list</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts Attendance Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-slate-800">Class Attendance Trend</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Aggregate attendance percentage over the last 10 working days.</p>
              </div>
              <div className="h-[300px] w-full min-w-0 relative">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #f1f5f9',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="Attendance %" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 1 }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic">No attendance trend logged.</div>
                )}
              </div>
            </div>

            {/* Top Performers Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-slate-800">Top Performing Students</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Highest academic performers based on average subject marks.</p>
              </div>
              <div className="flex-1 divide-y divide-slate-100">
                {topPerforming.map((student, idx) => (
                  <div key={student._id} className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{student.registerNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-600">{student.averageMark}%</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Average mark</p>
                    </div>
                  </div>
                ))}
                {topPerforming.length === 0 && (
                  <div className="flex items-center justify-center h-full text-slate-400 italic py-20">No student grades seeded.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MARK DAILY ATTENDANCE */}
      {activeSubTab === 'mark-attendance' && (
        <AttendanceMonitoring 
          departmentOnly={true} 
          advisorClass={faculty.classAdvisorDetails} 
          defaultSubTab="mark" 
        />
      )}

      {/* 3. ATTENDANCE SUBMISSION STATUS */}
      {activeSubTab === 'submission-status' && (
        <AttendanceMonitoring 
          departmentOnly={true} 
          advisorClass={faculty.classAdvisorDetails} 
          defaultSubTab="history" 
        />
      )}

      {/* 4. STUDENTS DIRECTORY */}
      {activeSubTab === 'students' && (
        <div className="space-y-6">
          {/* Search Directory Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
              <input 
                type="text" 
                placeholder="Search students by Name, Reg No..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Roster Category:</span>
              <span className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">Defaulters ({defaulters.length})</span>
              <span className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold">At-Risk ({atRisk.length})</span>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">S.No</th>
                    <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">Register No.</th>
                    <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">Student Name</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Batch</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Year</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Semester</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Section</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Mobile No.</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Parent Mobile</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Attendance %</th>
                    <th className="p-4 font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((s, idx) => {
                    const isDefaulter = s.attendancePercentage < 75;
                    const isAtRisk = s.attendancePercentage >= 75 && s.attendancePercentage < 80;
                    return (
                      <tr key={s._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{idx + 1}</td>
                        <td className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 font-mono">{s.registerNumber || '-'}</td>
                        <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                          <span 
                            onClick={() => setSelectedStudentId(s._id)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition font-bold"
                          >
                            {s.name}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{s.batch || '-'}</td>
                        <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{s.year || '-'}</td>
                        <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{s.semester || '-'}</td>
                        <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{s.section || '-'}</td>
                        <td className="p-4 text-slate-600 border-r border-slate-100">{s.mobile || '-'}</td>
                        <td className="p-4 text-slate-600 border-r border-slate-100">{s.parentMobile || '-'}</td>
                        <td className="p-4 border-r border-slate-100 align-middle">
                          <span className={`font-black text-sm ${
                            isDefaulter ? 'text-rose-600' : isAtRisk ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {s.attendancePercentage}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button 
                              onClick={() => setSelectedStudentId(s._id)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl border border-indigo-100/50 text-xs flex items-center gap-1.5 transition shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> View dossier
                            </button>
                            <button 
                              onClick={() => { setEditStudent(s); setIsModalOpen(true); }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 transition shadow-sm"
                            >
                              <UserCog className="w-3.5 h-3.5" /> Edit Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRoster.length === 0 && (
                    <tr>
                      <td colSpan="11" className="p-10 text-center text-slate-400 italic font-semibold">No students matching the filter found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ATTENDANCE HISTORY */}
      {activeSubTab === 'attendance-history' && (
        <AttendanceHistoryView advisorClass={faculty?.classAdvisorDetails} />
      )}

      {/* 6. ACADEMIC CALENDAR */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Academic Calendar</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Check important academic dates, holidays, exams, and scheduled events.</p>
            </div>
            <button 
              onClick={fetchCalendar} 
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingCalendar ? (
              <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4 text-left border-r border-slate-100">Date</th>
                      <th className="p-4 text-left border-r border-slate-100">Title / Event</th>
                      <th className="p-4 border-r border-slate-100">Type</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {calendarEvents.map(event => (
                      <tr key={event._id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-left font-bold text-slate-800 border-r border-slate-100">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-left max-w-xs truncate text-slate-600 border-r border-slate-100 font-bold" title={event.description}>
                          {event.title}
                        </td>
                        <td className="p-4 text-center border-r border-slate-100">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                            event.type === 'Holiday' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            event.type === 'Exam' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {event.type}
                          </span>
                        </td>
                        <td className="p-4 text-center text-[10px] text-slate-400 italic">
                          {event.isWorkingDay ? 'Working Day' : 'Holiday / Off'}
                        </td>
                      </tr>
                    ))}
                    {calendarEvents.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-10 text-center text-slate-400 italic font-semibold">No calendar events published.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditStudent(null); }}
        studentToEdit={editStudent}
        onSuccess={() => { setIsModalOpen(false); setEditStudent(null); fetchStats(); }}
        departmentOnly={true}
      />
    </div>
  );
}
