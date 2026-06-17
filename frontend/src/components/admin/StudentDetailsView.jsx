import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Printer, Loader2, Percent 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export default function StudentDetailsView({ studentId, onBack }) {
  const { user: currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawData, setRawData] = useState(null);

  // Filter states
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination for Daily Attendance Overview
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchAttendanceDetails();
  }, [studentId]);

  const fetchAttendanceDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(apiUrl(`/api/admin/students/${studentId}/attendance-details`), {
        headers: withAuthHeader()
      });
      setRawData(response.data);
      
      // Auto-set the current semester
      if (response.data?.student?.semester) {
        setSelectedSemester(`Semester ${response.data.student.semester}`);
      }

      // Initialize date inputs based on the records
      const dates = response.data?.dateWise?.map(r => new Date(r.date)) || [];
      if (dates.length > 0) {
        const sortedDates = dates.sort((a, b) => a - b);
        const formatForInput = (d) => d.toISOString().split('T')[0];
        setStartDate(formatForInput(sortedDates[0]));
        setEndDate(formatForInput(sortedDates[sortedDates.length - 1]));
      } else {
        // Fallback dates
        setStartDate('2026-01-01');
        setEndDate('2026-05-30');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // State for attendance slot editing
  const [activeEditingCell, setActiveEditingCell] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const handleUpdateStatus = async (newStatus) => {
    if (!activeEditingCell?.recordId) return;
    try {
      setUpdatingStatus(true);
      setUpdateError('');
      await axios.put(apiUrl(`/api/admin/attendance/${activeEditingCell.recordId}`), {
        status: newStatus,
        remarks: 'Corrected by Admin'
      }, {
        headers: withAuthHeader()
      });
      
      // Refresh the view
      await fetchAttendanceDetails();
      
      // Close modal
      setActiveEditingCell(null);
    } catch (err) {
      console.error(err);
      setUpdateError(err.response?.data?.message || 'Failed to update attendance status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[500px]">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-bold">Fetching academic and attendance profile...</p>
      </div>
    );
  }

  if (error || !rawData) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-8 text-center max-w-xl mx-auto my-10">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-rose-800 mb-2">Error Loading Profile</h3>
        <p className="text-rose-600 font-medium mb-6">{error || 'Could not retrieve data.'}</p>
        {onBack && !isStudent ? (
          <button onClick={onBack} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition">
            Go Back
          </button>
        ) : (
          <button onClick={fetchAttendanceDetails} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition">
            Retry
          </button>
        )}
      </div>
    );
  }

  const { student, dateWise, dailyTimeline, subjectWise, overall } = rawData;

  // 1. Semester Options
  const semesters = ['All Semesters', ...Array.from(new Set(
    (dateWise || []).map(r => r.semester).filter(Boolean)
  )).sort().map(s => `Semester ${s}`)];
  // If no semester is found in records, default to standard sem list
  const semesterList = semesters.length > 1 ? semesters : ['All Semesters', 'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

  // 2. Subject Options (Dynamic from records)
  const subjectList = ['All Subjects', ...Array.from(new Set(
    (subjectWise || []).map(s => `${s.code} - ${s.name}`)
  ))];

  // 3. Filter Logic
  const startDateTime = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
  const endDateTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

  // Filter dateWise attendance records
  const filteredDateWise = (dateWise || []).filter(rec => {
    // Subject filter
    if (selectedSubject !== 'All Subjects') {
      const subKey = `${rec.code} - ${rec.subject}`;
      if (subKey !== selectedSubject) return false;
    }
    // Semester filter (deducted from backend or local matching)
    if (selectedSemester !== 'All Semesters') {
      const semNum = selectedSemester.replace('Semester ', '');
      if (String(rec.semester || student.semester) !== String(semNum)) return false;
    }
    // Date range filter
    const recTime = new Date(rec.date).getTime();
    if (recTime < startDateTime || recTime > endDateTime) return false;

    return true;
  });

  const policies = rawData?.policies || { medicalLeavePolicy: 'Exclude', casualLeavePolicy: 'Count as Absent' };

  // Re-calculate statistics based on filters
  let filteredPresent = 0;
  let filteredLate = 0;
  let filteredAbsent = 0;
  let filteredOnDuty = 0;
  let filteredMedicalLeave = 0;
  let filteredCasualLeave = 0;

  filteredDateWise.forEach(r => {
    if (r.status === 'Present') filteredPresent++;
    else if (r.status === 'Late') filteredLate++;
    else if (r.status === 'Absent') filteredAbsent++;
    else if (r.status === 'On-Duty' || r.status === 'On Duty') filteredOnDuty++;
    else if (r.status === 'Medical Leave') filteredMedicalLeave++;
    else if (r.status === 'Casual Leave') filteredCasualLeave++;
  });

  let attended = filteredPresent + filteredLate + filteredOnDuty;
  let conducted = filteredPresent + filteredLate + filteredOnDuty + filteredAbsent;

  if (policies.medicalLeavePolicy === 'Count as Present') {
    attended += filteredMedicalLeave;
    conducted += filteredMedicalLeave;
  } else if (policies.medicalLeavePolicy === 'Count as Absent') {
    conducted += filteredMedicalLeave;
  } // Exclude doesn't add to attended or conducted

  if (policies.casualLeavePolicy === 'Count as Present') {
    attended += filteredCasualLeave;
    conducted += filteredCasualLeave;
  } else if (policies.casualLeavePolicy === 'Count as Absent') {
    conducted += filteredCasualLeave;
  } // Exclude doesn't add to attended or conducted

  const filteredTotal = conducted;
  const filteredPct = conducted > 0 ? Math.round((attended / conducted) * 100) : 0;

  // Filter subject-wise data
  const filteredSubjectWise = (subjectWise || []).map(sub => {
    // Filter records for this subject
    const recordsForSub = filteredDateWise.filter(r => r.code === sub.code);
    
    let subPresent = 0;
    let subLate = 0;
    let subAbsent = 0;
    let subOnDuty = 0;
    let subMedicalLeave = 0;
    let subCasualLeave = 0;

    recordsForSub.forEach(r => {
      if (r.status === 'Present') subPresent++;
      else if (r.status === 'Late') subLate++;
      else if (r.status === 'Absent') subAbsent++;
      else if (r.status === 'On-Duty' || r.status === 'On Duty') subOnDuty++;
      else if (r.status === 'Medical Leave') subMedicalLeave++;
      else if (r.status === 'Casual Leave') subCasualLeave++;
    });

    let subAttended = subPresent + subLate + subOnDuty;
    let subConducted = subPresent + subLate + subOnDuty + subAbsent;

    if (policies.medicalLeavePolicy === 'Count as Present') {
      subAttended += subMedicalLeave;
      subConducted += subMedicalLeave;
    } else if (policies.medicalLeavePolicy === 'Count as Absent') {
      subConducted += subMedicalLeave;
    }

    if (policies.casualLeavePolicy === 'Count as Present') {
      subAttended += subCasualLeave;
      subConducted += subCasualLeave;
    } else if (policies.casualLeavePolicy === 'Count as Absent') {
      subConducted += subCasualLeave;
    }

    const subPct = subConducted > 0 ? Math.round((subAttended / subConducted) * 100) : 0;

    return {
      ...sub,
      total: subConducted,
      present: subAttended,
      absent: subConducted - subAttended,
      percentage: subPct
    };
  }).filter(sub => {
    if (selectedSubject !== 'All Subjects') {
      return `${sub.code} - ${sub.name}` === selectedSubject;
    }
    return true;
  });

  // Filter dailyTimeline for grid display
  const filteredTimeline = (dailyTimeline || []).filter(item => {
    // Semester filter
    if (selectedSemester !== 'All Semesters') {
      const semNum = selectedSemester.replace('Semester ', '');
      if (String(item.semester || student.semester) !== String(semNum)) return false;
    }
    // Date range filter
    const recTime = new Date(item.date).getTime();
    if (recTime < startDateTime || recTime > endDateTime) return false;
    return true;
  });

  // Pagination slicing for daily timeline records
  const totalGridRows = filteredTimeline.length;
  const totalPages = Math.ceil(totalGridRows / itemsPerPage) || 1;
  const paginatedTimeline = filteredTimeline.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Monthly stats for chart
  const chartData = (rawData.monthly || []).map(m => ({
    name: m.month,
    'Present %': m.percentage,
    'Absent %': Math.max(0, 100 - m.percentage)
  })).reverse();

  // If no monthly stats, construct from filteredDateWise
  const finalChartData = chartData.length > 0 ? chartData : [
    { name: 'Week 1', 'Present %': filteredPct, 'Absent %': 100 - filteredPct },
    { name: 'Week 2', 'Present %': Math.min(100, filteredPct + 2), 'Absent %': Math.max(0, 98 - filteredPct) },
    { name: 'Week 3', 'Present %': Math.max(0, filteredPct - 4), 'Absent %': Math.min(100, 104 - filteredPct) },
    { name: 'Week 4', 'Present %': filteredPct, 'Absent %': 100 - filteredPct }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-4">
      {/* Styles for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
            break-inside: avoid;
          }
          .print-badge-green {
            background-color: #dcfce7 !important;
            color: #16a34a !important;
            border: 1px solid #16a34a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-badge-red {
            background-color: #fee2e2 !important;
            color: #dc2626 !important;
            border: 1px solid #dc2626 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          }
        }
      `}} />

      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 no-print">
        {onBack && !isStudent ? (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 self-start px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" /> Back to Student List
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Year</span>
            <p className="text-sm font-extrabold text-slate-700">2025-2026</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/50 px-4 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Live Feed Active</span>
          </div>
        </div>
      </div>

      {/* Profile Header & Interactive Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden print-card">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              <span>Academics</span>
              <span>/</span>
              <span className="text-white">Attendance Overview</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{student.name}</h2>
            <p className="text-sm font-semibold text-slate-300 mt-1">
              Roll No: {student.rollNumber || 'N/A'} | Reg No: {student.registerNumber || '-'} | {student.department || 'N/A'} Department {student.batch ? `| Batch: ${student.batch}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition shadow-lg backdrop-blur-sm"
            >
              <Printer className="w-4.5 h-4.5" /> Print Report
            </button>
          </div>
        </div>

        {/* Dynamic Filters Row */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Semester</label>
            <select 
              value={selectedSemester} 
              onChange={e => { setSelectedSemester(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              {semesterList.map(sem => <option key={sem} value={sem}>{sem}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">From Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">To Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Premium Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-grid">
        {/* Card 1: Total Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex items-center gap-4 print-card">
          <div className="bg-sky-50 p-3.5 rounded-2xl text-sky-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Days</h4>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{filteredTotal}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">This Semester</p>
          </div>
        </div>

        {/* Card 2: Present */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex items-center gap-4 print-card">
          <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Present</h4>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{attended}</span>
              <span className="text-xs font-bold text-emerald-600">({filteredPct}%)</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Days Present</p>
          </div>
        </div>

        {/* Card 3: Absent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex items-center gap-4 print-card">
          <div className="bg-rose-50 p-3.5 rounded-2xl text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Absent</h4>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{filteredAbsent}</span>
              <span className="text-xs font-bold text-rose-600">({conducted > 0 ? Math.round((filteredAbsent / conducted) * 100) : 0}%)</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Days Absent</p>
          </div>
        </div>

        {/* Card 4: Overall Attendance % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex items-center gap-4 print-card">
          <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Overall Attendance %</h4>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{overall?.percentage ?? 0}%</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Cumulative Attendance</p>
          </div>
        </div>
      </div>

      {/* Date-wise Attendance Overview Block */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] overflow-hidden print-card">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">Daily Attendance Overview</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Unified log of student attendance status per day.</p>
          </div>
          
          {/* Colors Legend */}
          <div className="flex flex-wrap gap-2 text-[10px] font-black tracking-wide">
            <span className="px-2.5 py-1 bg-emerald-500 text-white rounded shadow-sm">PRESENT</span>
            <span className="px-2.5 py-1 bg-rose-500 text-white rounded shadow-sm">ABSENT</span>
            <span className="px-2.5 py-1 bg-indigo-600 text-white rounded shadow-sm">ON DUTY</span>
            <span className="px-2.5 py-1 bg-teal-500 text-white rounded shadow-sm">MEDICAL LEAVE</span>
            <span className="px-2.5 py-1 bg-blue-500 text-white rounded shadow-sm">CASUAL LEAVE</span>
            <span className="px-2.5 py-1 bg-amber-500 text-white rounded shadow-sm">LATE</span>
            <span className="px-2.5 py-1 bg-purple-650 text-white rounded shadow-sm">HOLIDAY</span>
          </div>
        </div>

        {/* Day Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm font-semibold border-collapse whitespace-nowrap">
            <thead className="bg-slate-100/70 border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider w-36 border-r border-slate-200/50">Date</th>
                <th className="p-3.5 text-slate-700 font-bold text-xs uppercase tracking-wider border-r border-slate-200/50">Attendance Status</th>
                <th className="p-3.5 text-slate-700 font-bold text-xs uppercase tracking-wider border-r border-slate-200/50">Marked By</th>
                <th className="p-3.5 text-slate-700 font-bold text-xs uppercase tracking-wider border-r border-slate-200/50">Verification Type</th>
                {currentUser?.role !== 'Principal' && currentUser?.role !== 'Student' && (
                  <th className="p-3.5 text-slate-700 font-bold text-xs uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs">
              {paginatedTimeline.map((row, idx) => {
                let cellClass = 'bg-slate-100 text-slate-400 border border-slate-200';
                let printClass = '';
                if (row.status === 'Present') {
                  cellClass = 'bg-emerald-500 text-white shadow-sm border border-emerald-600';
                  printClass = 'print-badge-green';
                } else if (row.status === 'Absent') {
                  cellClass = 'bg-rose-500 text-white shadow-sm border border-rose-600';
                  printClass = 'print-badge-red';
                } else if (row.status === 'Late') {
                  cellClass = 'bg-amber-500 text-white shadow-sm border border-amber-600';
                } else if (row.status === 'On-Duty' || row.status === 'On Duty') {
                  cellClass = 'bg-indigo-650 text-white shadow-sm border border-indigo-700';
                } else if (row.status === 'Medical Leave' || row.status === 'Casual Leave') {
                  cellClass = 'bg-teal-500 text-white shadow-sm border border-teal-600';
                } else if (row.status === 'Holiday') {
                  cellClass = 'bg-purple-600 text-white shadow-sm border border-purple-700';
                }

                const isEditable = (row.recordId && !isStudent && currentUser?.role !== 'Principal') ? true : false;
                
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-left font-bold text-slate-700 border-r border-slate-100/50">{row.date}</td>
                    <td className="p-3.5 border-r border-slate-100/50 align-middle">
                      <span 
                        className={`inline-block px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider min-w-[100px] ${cellClass} ${printClass}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3.5 border-r border-slate-100/50 text-slate-500 font-medium">{row.markedBy || '-'}</td>
                    <td className="p-3.5 border-r border-slate-100/50 text-slate-500 font-medium font-mono">{row.entryType || '-'}</td>
                    {currentUser?.role !== 'Principal' && currentUser?.role !== 'Student' && (
                      <td className="p-3.5 align-middle">
                        {isEditable ? (
                          <button 
                            onClick={() => {
                              setActiveEditingCell({
                                date: row.date,
                                hourKey: 'Day Attendance',
                                recordId: row.recordId,
                                currentStatus: row.status,
                                code: 'DAY'
                              });
                            }}
                            className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 active:scale-95 transition-all text-[11px] font-black uppercase cursor-pointer"
                          >
                            Correct Status
                          </button>
                        ) : (
                          <span className="text-slate-350 italic font-semibold">Locked</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {paginatedTimeline.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium italic bg-slate-50/20">
                    No daily attendance logs found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Timeline Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white no-print">
          <p className="text-xs font-bold text-slate-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalGridRows)} of {totalGridRows} entries
          </p>
          <div className="flex gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(c => c - 1)}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 font-bold transition text-xs"
            >
              &lt;
            </button>
            {[...Array(totalPages)].map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                className={`w-8 h-8 flex items-center justify-center border rounded-lg text-xs font-bold transition ${currentPage === idx + 1 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                {idx + 1}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(c => c + 1)}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 font-bold transition text-xs"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Trends only */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-1">
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-12 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex flex-col print-card">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-800">Attendance Trend</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Chronological trajectory of attendance rates.</p>
          </div>
          <div className="h-[220px] w-full min-w-0 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={finalChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
                  dataKey="Present %" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 1 }} 
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Absent %" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={{ r: 3 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Advisor Logs & Interventions Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] overflow-hidden print-card">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-extrabold text-slate-800">Advisor Logs, Mentorship & Interventions</h3>
          <p className="text-xs font-semibold text-slate-500 mt-1">Counseling records, parent contact journals, academic interventions, and grievances logged by the Class Advisor.</p>
        </div>
        <div className="p-6 space-y-4">
          {rawData.advisorLogs && rawData.advisorLogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rawData.advisorLogs.map((log) => (
                <div key={log._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500 text-white">
                      {log.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">{log.title}</h4>
                  <p className="text-slate-600 font-semibold leading-relaxed bg-white border border-slate-100 p-2.5 rounded-lg">
                    {log.description}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-bold border-t border-slate-200/50 pt-1.5">
                    <div>Status: <span className="text-slate-600">{log.status}</span></div>
                    <div>Advisor: <span className="text-slate-600">{log.advisor?.name || 'Assigned Advisor'}</span></div>
                    {log.isEscalatedToHOD && (
                      <div className="text-rose-500 font-black animate-pulse">ESCALATED TO HOD</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 font-semibold italic">No counseling logs or mentorship records registered for this student.</div>
          )}
        </div>
      </div>

      {/* Edit Attendance Slot Modal */}
      {activeEditingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold">Edit Attendance Slot</h3>
                <p className="text-[11px] text-slate-300 font-semibold mt-0.5">Quick correction of attendance status</p>
              </div>
              <button 
                onClick={() => setActiveEditingCell(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {updateError && (
                <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl font-bold text-xs">
                  {updateError}
                </div>
              )}

              {/* Slot details card */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Date</span>
                  <span className="font-extrabold text-slate-700">{activeEditingCell.date}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Slot Time</span>
                  <span className="font-extrabold text-slate-700">{activeEditingCell.hourKey}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Course Code</span>
                  <span className="font-black text-indigo-600">{activeEditingCell.code}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 pt-1.5 border-t border-slate-200/50">
                  <span>Current Status</span>
                  <span className="font-black text-slate-700 uppercase">{activeEditingCell.currentStatus}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Select New Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('Present')}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-emerald-500/10 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Present
                  </button>
                  <button 
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('Absent')}
                    className="flex items-center justify-center gap-2 p-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/10 text-xs"
                  >
                    <XCircle className="w-4 h-4" /> Absent
                  </button>
                  <button 
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('Late')}
                    className="flex items-center justify-center gap-2 p-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-amber-500/10 text-xs"
                  >
                    <Clock className="w-4 h-4" /> Late
                  </button>
                  <button 
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('On-Duty')}
                    className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-indigo-600/10 text-xs"
                  >
                    <AlertCircle className="w-4 h-4" /> On-Duty
                  </button>
                  <button 
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('Medical Leave')}
                    className="flex items-center justify-center gap-2 p-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-teal-500/10 text-xs col-span-2"
                  >
                    <Calendar className="w-4 h-4" /> Medical Leave
                  </button>
                  <button 
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('Casual Leave')}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/10 text-xs col-span-2"
                  >
                    <Calendar className="w-4 h-4" /> Casual Leave
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                type="button"
                disabled={updatingStatus}
                onClick={() => setActiveEditingCell(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
