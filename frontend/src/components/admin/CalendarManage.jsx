import { useState, useEffect } from 'react';
import { getCalendar, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, bulkDeleteCalendarEvents } from '../../api/adminApi';
import Tesseract from 'tesseract.js';
import BulkUpload from './BulkUpload';
import { Upload, X, Loader2, FileImage } from 'lucide-react';

export default function CalendarManage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ date: '', type: 'Working Day', description: '', term: '' });
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [events]);

  const fetchEvents = async () => {
    try {
      const res = await getCalendar();
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ date: '', type: 'Working Day', description: '', term: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCalendarEvent(editingId, form);
        setEditingId(null);
      } else {
        await addCalendarEvent(form);
      }
      setForm({ date: '', type: 'Working Day', description: '', term: '' });
      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      alert(editingId ? 'Error updating calendar event' : 'Error adding calendar event');
    }
  };

  const handleEdit = (event) => {
    setEditingId(event._id);
    const dateDefault = event.date ? new Date(event.date).toISOString().split('T')[0] : '';
    setForm({
      date: dateDefault,
      type: event.type || 'Working Day',
      description: event.description || '',
      term: event.term || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete calendar event "${event.description}"?`)) return;
    try {
      await deleteCalendarEvent(event._id);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting calendar event');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(events.map(ev => ev._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected calendar events?`)) return;

    try {
      await bulkDeleteCalendarEvents(selectedIds);
      alert('Selected calendar events deleted successfully!');
      setSelectedIds([]);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting selected events');
    }
  };

  const parseCalendarLines = (text) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line.includes(','))
      .map((line) => line.split(',').map((token) => token.trim()))
      .filter((parts) => parts.length >= 3)
      .map((parts) => ({
        date: parts[0],
        type: parts[1],
        description: parts[2],
        term: parts[3] || ''
      }));
  };

  const handleImportFromImage = async (file) => {
    if (!file) return;
    setImportLoading(true);
    setImportMessage('Reading calendar image...');
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const rows = parseCalendarLines(result.data.text);

      if (rows.length === 0) {
        setImportMessage('No valid rows found. Use format: YYYY-MM-DD,Type,Description,Term');
        return;
      }

      let imported = 0;
      for (const row of rows) {
        if (!row.date || !row.type || !row.description) continue;
        await addCalendarEvent(row);
        imported += 1;
      }
      await fetchEvents();
      setImportMessage(`Imported ${imported} calendar events from image.`);
    } catch (err) {
      console.error(err);
      setImportMessage('Image import failed. Please try a clearer image.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Edit Academic Calendar</h2>
      
      <BulkUpload type="calendar" onUploadSuccess={fetchEvents} />

      {/* Modal popup for Add/Edit Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">{editingId ? 'Edit Event' : 'Add New Event'}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Specify academic calendar date and type details.</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }} 
                className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                <input 
                  required 
                  type="date" 
                  value={form.date} 
                  onChange={e => setForm({...form, date: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Event Type</label>
                <select 
                  required 
                  value={form.type} 
                  onChange={e => setForm({...form, type: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option>Working Day</option>
                  <option>Holiday</option>
                  <option>Exam</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <input 
                  required 
                  placeholder="e.g. Diwali, Midterm Exams, Sports Day" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }} 
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 transition text-sm"
                >
                  {editingId ? 'Update Event' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] border border-slate-100 mb-8">
        <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
          <FileImage className="w-5 h-5 text-orange-500 shrink-0" />
          Alternative: Import Calendar from Image
        </h3>
        <p className="text-xs md:text-sm text-slate-500 font-medium mb-4">
          Upload a calendar screenshot/photo. OCR expects rows like:
          <span className="font-mono ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[11px]">YYYY-MM-DD,Type,Description,Term</span>
        </p>
        
        <div className="w-full md:w-auto">
          <input
            type="file"
            id="calendar-image-upload"
            accept="image/*"
            disabled={importLoading}
            onChange={(e) => handleImportFromImage(e.target.files?.[0])}
            className="hidden"
          />

          {!importLoading ? (
            <div 
              onClick={() => document.getElementById('calendar-image-upload').click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-2xl p-5 cursor-pointer hover:bg-orange-50/10 transition text-center w-full md:w-80 group active:scale-[0.98]"
            >
              <Upload className="w-7 h-7 text-orange-500 mb-1.5 group-hover:scale-110 transition shrink-0" />
              <span className="text-xs font-extrabold text-orange-600">Choose Screenshot / Photo</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 border border-orange-100 rounded-xl p-4 bg-orange-50/20 w-full md:w-80 justify-center">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
              <span className="text-xs font-bold text-orange-700">Reading calendar image...</span>
            </div>
          )}
        </div>

        {importMessage && (
          <div className="w-full md:w-80 mt-4 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
            <span>{importMessage}</span>
            <button 
              type="button"
              onClick={() => setImportMessage('')}
              className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 rounded-full hover:bg-slate-200/50 transition"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800">Calendar Events</h3>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition text-xs shadow-md shadow-red-500/20"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={openAddModal}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg transition text-xs shadow-md shadow-orange-500/20"
          >
            Add Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-center w-12">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={events.length > 0 && events.every(ev => selectedIds.includes(ev._id))}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="p-4">Date</th>
              <th className="p-4">Type</th>
              <th className="p-4">Description</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev._id} className="border-b">
                <td className="p-4 text-center w-12">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(ev._id)} 
                    onChange={() => handleSelectRow(ev._id)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="p-4 font-mono">{new Date(ev.date).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-sm ${
                    ev.type === 'Holiday' ? 'bg-red-100 text-red-800' :
                    ev.type === 'Exam' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {ev.type}
                  </span>
                </td>
                <td className="p-4">{ev.description}</td>
                <td className="p-4 space-x-2">
                  <button onClick={() => handleEdit(ev)} className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">Edit</button>
                  <button onClick={() => handleDelete(ev)} className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
