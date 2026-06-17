import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import {
  Calendar, Search, Users, CheckCircle, XCircle, Clock,
  Edit3, Save, X, RotateCcw, AlertCircle, History, Download
} from 'lucide-react';

export default function AttendanceHistoryView({ advisorClass }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, late: 0, onDuty: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setEditingId(null);
    try {
      const res = await axios.get(apiUrl('/api/admin/advisor/attendance-history'), {
        params: { date: selectedDate },
        headers: withAuthHeader()
      });
      setRecords(res.data.records || []);
      setSummary(res.data.summary || { total: 0, present: 0, absent: 0, late: 0, onDuty: 0 });
      setLoaded(true);
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setError(err.response?.data?.message || 'Failed to load attendance history.');
      setRecords([]);
      setSummary({ total: 0, present: 0, absent: 0, late: 0, onDuty: 0 });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (record) => {
    setEditingId(record._id);
    setEditStatus(record.status);
    setEditRemarks(record.remarks || '');
    setSuccessMsg('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditStatus('');
    setEditRemarks('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await axios.put(
        apiUrl(`/api/admin/advisor/attendance-history/${editingId}`),
        { status: editStatus, remarks: editRemarks },
        { headers: withAuthHeader() }
      );
      // Update the record in local state
      setRecords(prev =>
        prev.map(r => r._id === editingId ? { ...r, ...res.data.record } : r)
      );
      // Recompute summary
      const updatedRecords = records.map(r => r._id === editingId ? { ...r, status: editStatus, remarks: editRemarks } : r);
      const newSummary = { total: updatedRecords.length, present: 0, absent: 0, late: 0, onDuty: 0 };
      updatedRecords.forEach(r => {
        if (r.status === 'Present') newSummary.present++;
        else if (r.status === 'Absent') newSummary.absent++;
        else if (r.status === 'Late') newSummary.late++;
        else if (['On-Duty', 'On Duty'].includes(r.status)) newSummary.onDuty++;
      });
      setSummary(newSummary);
      setEditingId(null);
      setSuccessMsg(`Attendance updated successfully for this student.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving attendance edit:', err);
      setError(err.response?.data?.message || 'Failed to save attendance update.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSummary = () => {
    if (records.length === 0) return;
    
    const classInfo = advisorClass 
      ? `${advisorClass.department} - Year ${advisorClass.year} Sem ${advisorClass.semester} Sec ${advisorClass.section}`
      : 'N/A';
      
    const csvRows = [
      ['NITify Attendance Summary Report'],
      [`Class Details: ${classInfo}`],
      [`Date: ${selectedDate} (${formattedDate})`],
      [''],
      ['Summary Metrics:'],
      [`Total Students,${summary.total}`],
      [`Present,${summary.present}`],
      [`Absent,${summary.absent}`],
      [`Late,${summary.late}`],
      [`On-Duty,${summary.onDuty}`],
      [`Overall Attendance,${attendancePercent}%`],
      [''],
      ['Student Attendance Records:'],
      ['S.No', 'Register Number', 'Student Name', 'Status', 'Remarks', 'Marked At']
    ];

    records.forEach((r, idx) => {
      const markedTime = r.markedAt
        ? new Date(r.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '-';
      csvRows.push([
        idx + 1,
        `"${r.registerNumber || ''}"`,
        `"${r.studentName || ''}"`,
        r.status || '',
        `"${r.remarks || ''}"`,
        markedTime
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const safeDate = selectedDate.replace(/\//g, '-');
    const deptName = advisorClass ? `${advisorClass.department}_Y${advisorClass.year}_Sec${advisorClass.section}` : 'advisor';
    link.setAttribute("download", `attendance_summary_${deptName}_${safeDate}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Present': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Absent': 'bg-rose-50 text-rose-700 border-rose-200',
      'Late': 'bg-amber-50 text-amber-700 border-amber-200',
      'On-Duty': 'bg-blue-50 text-blue-700 border-blue-200',
      'On Duty': 'bg-blue-50 text-blue-700 border-blue-200',
      'Medical Leave': 'bg-purple-50 text-purple-700 border-purple-200',
      'Casual Leave': 'bg-slate-50 text-slate-700 border-slate-200',
    };
    return styles[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const attendancePercent = summary.total > 0
    ? (((summary.present + summary.late + summary.onDuty) / summary.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-extrabold text-slate-800">Attendance History</h3>
            </div>
            <p className="text-xs text-slate-400 font-semibold">
              Select a date to view and edit attendance records for your class.
              {advisorClass && (
                <span className="ml-2 text-indigo-500 font-bold">
                  ({advisorClass.department} - Year {advisorClass.year} | Sem {advisorClass.semester} | Sec {advisorClass.section})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Date Picker + Load */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 mt-5">
          <div className="flex flex-col flex-1 max-w-xs">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Select Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading || !selectedDate}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Loading...' : 'Load History'}
          </button>
          {loaded && (
            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition"
            >
              <RotateCcw className="w-4 h-4" /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Content (only after load) */}
      {loaded && (
        <>
          {/* Date Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Viewing Attendance For</p>
              <p className="text-white text-lg sm:text-xl font-extrabold mt-0.5">{formattedDate}</p>
            </div>
            {records.length > 0 && (
              <button
                onClick={handleDownloadSummary}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 hover:bg-slate-50 font-bold rounded-xl transition shadow-lg text-sm shrink-0 border border-slate-200/50"
              >
                <Download className="w-4 h-4 text-indigo-600" /> Download Summary (CSV)
              </button>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                <p className="text-xl font-black text-slate-800">{summary.total}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-emerald-50 p-2.5 rounded-xl"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Present</p>
                <p className="text-xl font-black text-emerald-600">{summary.present}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-rose-50 p-2.5 rounded-xl"><XCircle className="w-5 h-5 text-rose-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Absent</p>
                <p className="text-xl font-black text-rose-600">{summary.absent}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-amber-50 p-2.5 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Late</p>
                <p className="text-xl font-black text-amber-600">{summary.late}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-xl"><Clock className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">On-Duty</p>
                <p className="text-xl font-black text-blue-600">{summary.onDuty}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Attendance %</p>
                <p className="text-xl font-black text-indigo-600">{attendancePercent}%</p>
              </div>
            </div>
          </div>

          {/* Records Table */}
          {records.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-base font-bold text-slate-600">No Attendance Records Found</h4>
              <p className="text-xs text-slate-400 font-semibold mt-1">No attendance was marked for this date. Try selecting a different date.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-800">
                  Student Attendance Records
                  <span className="text-slate-400 font-semibold ml-2">({records.length} students)</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Click Edit to modify a student's attendance</span>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-4 font-bold text-slate-700 text-center border-r border-slate-100 w-14">S.No</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Register No.</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Student Name</th>
                      <th className="p-4 font-bold text-slate-700 text-center border-r border-slate-100 w-36">Status</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Remarks</th>
                      <th className="p-4 font-bold text-slate-700 text-center border-r border-slate-100 w-28">Marked At</th>
                      <th className="p-4 font-bold text-slate-700 text-center w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record, idx) => {
                      const isEditing = editingId === record._id;

                      return (
                        <tr key={record._id} className={`transition ${isEditing ? 'bg-indigo-50/40 ring-1 ring-indigo-100' : 'hover:bg-slate-50/70'}`}>
                          <td className="p-4 text-center font-semibold text-slate-600 border-r border-slate-100">{idx + 1}</td>
                          <td className="p-4 font-bold text-slate-700 font-mono border-r border-slate-100">{record.registerNumber}</td>
                          <td className="p-4 font-bold text-slate-800 border-r border-slate-100">{record.studentName}</td>

                          {/* Status */}
                          <td className="p-4 text-center border-r border-slate-100">
                            {isEditing ? (
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full border border-indigo-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                                <option value="On-Duty">On-Duty</option>
                                <option value="Medical Leave">Medical Leave</option>
                                <option value="Casual Leave">Casual Leave</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(record.status)}`}>
                                {record.status}
                              </span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td className="p-4 border-r border-slate-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editRemarks}
                                onChange={(e) => setEditRemarks(e.target.value)}
                                placeholder="Enter remarks..."
                                className="w-full border border-indigo-200 rounded-lg p-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                              />
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">{record.remarks || '-'}</span>
                            )}
                          </td>

                          {/* Marked At */}
                          <td className="p-4 text-center border-r border-slate-100">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {record.markedAt
                                ? new Date(record.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition shadow-sm disabled:opacity-60"
                                >
                                  {saving ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saving}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-[11px] transition"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(record)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-lg border border-indigo-100/50 text-[11px] transition shadow-sm mx-auto"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial State (before first load) */}
      {!loaded && !loading && !error && (
        <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <History className="w-8 h-8 text-indigo-400" />
          </div>
          <h4 className="text-base font-bold text-slate-600">Select a Date to View History</h4>
          <p className="text-xs text-slate-400 font-semibold mt-2 max-w-md mx-auto">
            Choose a date from the date picker above and click "Load History" to view all attendance records
            marked for that day. You can then view and edit individual student records.
          </p>
        </div>
      )}
    </div>
  );
}
