import React, { useState, useEffect } from 'react';
import { getUsers } from '../../api/adminApi';
import { Search, Download, RotateCcw, Eye, Shield, Users } from 'lucide-react';
import FacultyDetailsView from './FacultyDetailsView';

export default function PrincipalFacultyManage() {
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('hods'); // 'hods' or 'advisors'

  // Selected faculty for dossier view
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getUsers();
      setFacultyList(res.data);
    } catch (err) {
      console.error('Error fetching academic staff:', err);
      setError('Failed to load academic staff directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setDeptFilter('');
  };

  // Filter HODs
  const hodList = facultyList.filter(f => f.role === 'HoD');
  // Filter Class Advisors
  const advisorList = facultyList.filter(f => f.classAdvisorDetails?.isClassAdvisor === true || f.role === 'Class Advisor');

  // Apply search & dept filter on active lists
  const filterList = (list) => {
    let result = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.registerNumber && f.registerNumber.toLowerCase().includes(q)) ||
        (f.employeeId && f.employeeId.toLowerCase().includes(q))
      );
    }
    if (deptFilter) {
      result = result.filter(f => f.department === deptFilter);
    }
    return result;
  };

  const filteredHods = filterList(hodList);
  const filteredAdvisors = filterList(advisorList);

  const handleExport = () => {
    let csvRows = [];
    if (activeSubTab === 'advisors') {
      csvRows.push(['S.No', 'Department', 'Year', 'Semester', 'Section', 'Advisor Name', 'Email Address', 'Mobile No.', 'Status']);
      filteredAdvisors.forEach((f, idx) => {
        csvRows.push([
          idx + 1,
          f.classAdvisorDetails?.department || f.department || '',
          f.classAdvisorDetails?.year || '',
          f.classAdvisorDetails?.semester || '',
          f.classAdvisorDetails?.section || '',
          f.name || '',
          f.email || '',
          f.mobile || '',
          f.isActive !== false ? 'Active' : 'Inactive'
        ]);
      });
    } else {
      csvRows.push(['S.No', 'Department', 'HOD Name', 'Email Address', 'Mobile No.', 'Designation', 'Status']);
      filteredHods.forEach((f, idx) => {
        csvRows.push([
          idx + 1,
          f.department || '',
          f.name || '',
          f.email || '',
          f.mobile || '',
          f.designation || '',
          f.isActive !== false ? 'Active' : 'Inactive'
        ]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filePrefix = activeSubTab === 'advisors' ? 'class_advisors_directory' : 'hods_directory';
    link.setAttribute("download", `${filePrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto mt-10"></div>;

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center max-w-xl mx-auto my-10">
        <h3 className="text-lg font-bold text-rose-800 mb-2">Error Loading Directory</h3>
        <p className="text-rose-600 font-medium mb-4">{error}</p>
        <button onClick={fetchFaculty} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition">
          Retry
        </button>
      </div>
    );
  }

  if (selectedFaculty) {
    return (
      <FacultyDetailsView 
        faculty={selectedFaculty} 
        onBack={() => setSelectedFaculty(null)} 
      />
    );
  }

  const departments = [...new Set(facultyList.map(f => f.department).filter(Boolean))].sort();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Faculty Management</h2>
          <p className="text-slate-500 font-medium mt-1">View department heads and academic advisors directories.</p>
        </div>
      </div>

      {/* Directory Filter / Controls */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Department</label>
              <select 
                value={deptFilter} 
                onChange={e => setDeptFilter(e.target.value)} 
                className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 bg-slate-50"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Search Staff</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search by Name / Email / ID" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleReset} 
              className="flex-1 md:flex-initial bg-white border border-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm shadow-sm h-[38px]"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button 
              onClick={handleExport} 
              className="flex-1 md:flex-initial bg-indigo-650 hover:bg-indigo-750 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-indigo-500/20 text-sm h-[38px]"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Directory Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('hods')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all duration-155 ${
            activeSubTab === 'hods' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" /> Department Heads (HODs)
        </button>
        <button
          onClick={() => setActiveSubTab('advisors')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all duration-155 ${
            activeSubTab === 'advisors' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Class Advisors
        </button>
      </div>

      {/* Directory Content */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        {activeSubTab === 'hods' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100 w-16">S.No</th>
                  <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Department</th>
                  <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">HOD Name</th>
                  <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Email Address</th>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Mobile No.</th>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Designation</th>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Status</th>
                  <th className="p-4 font-bold text-slate-800 w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHods.map((hod, idx) => (
                  <tr key={hod._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">{hod.department}</td>
                    <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                      <span 
                        onClick={() => setSelectedFaculty(hod)} 
                        className="text-indigo-650 hover:text-indigo-850 hover:underline cursor-pointer transition font-bold"
                      >
                        {hod.name}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-left border-r border-slate-100 font-mono">{hod.email}</td>
                    <td className="p-4 text-slate-650 border-r border-slate-100 font-semibold">{hod.mobile || '-'}</td>
                    <td className="p-4 text-slate-500 border-r border-slate-100 font-semibold">{hod.designation || 'HOD'}</td>
                    <td className="p-4 border-r border-slate-100">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${hod.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {hod.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedFaculty(hod)}
                        className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition flex items-center justify-center mx-auto"
                        title="View Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHods.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500 italic">No HOD records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100 w-16">S.No</th>
                  <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Department</th>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Advisor For (Yr / Sem / Sec)</th>
                  <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Advisor Name</th>
                  <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Email Address</th>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Mobile No.</th>
                  <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Status</th>
                  <th className="p-4 font-bold text-slate-800 w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvisors.map((adv, idx) => {
                  const d = adv.classAdvisorDetails || {};
                  return (
                    <tr key={adv._id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">{d.department || adv.department}</td>
                      <td className="p-4 border-r border-slate-100 font-bold">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                          {d.year ? `Y${d.year}` : '-'} / {d.semester ? `S${d.semester}` : '-'} / {d.section ? `Sec ${d.section}` : '-'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                        <span 
                          onClick={() => setSelectedFaculty(adv)} 
                          className="text-indigo-650 hover:text-indigo-855 hover:underline cursor-pointer transition font-bold"
                        >
                          {adv.name}
                        </span>
                      </td>
                      <td className="p-4 text-slate-650 text-left border-r border-slate-100 font-mono">{adv.email}</td>
                      <td className="p-4 text-slate-605 border-r border-slate-100 font-semibold">{adv.mobile || '-'}</td>
                      <td className="p-4 border-r border-slate-100">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${adv.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-650'}`}>
                          {adv.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setSelectedFaculty(adv)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition flex items-center justify-center mx-auto"
                          title="View Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAdvisors.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-550 italic">No advisor records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
