import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, TrendingUp, Calendar, User, 
  AlertTriangle, ShieldAlert, CheckCircle, Info 
} from 'lucide-react';

const translations = {
  en: {
    portalTitle: 'NITify',
    portalSubtitle: 'Parent Portal',
    logout: 'Logout',
    loadingText: 'Accessing child secure academic record...',
    connectionFailure: 'Connection Failure',
    welcomeTitle: 'Hello, {name}',
    welcomeSubtitle: 'Here is the real-time attendance report for your child.',
    refreshData: 'Refresh Data',
    criticalAlertTitle: 'Critical Attendance Alert',
    criticalAlertText1: "Your child's attendance rate is currently at ",
    criticalAlertText2: ", which falls below the minimum required compliance threshold of ",
    criticalAlertText3: '.',
    criticalAlertHelp: 'Please advise your child to attend classes regularly to avoid academic detention or penalization.',
    successAlertTitle: 'Attendance Requirements Met',
    successAlertText1: 'Your child is in good academic standing with an attendance of ',
    successAlertText2: ', which meets the minimum required compliance threshold of ',
    successAlertText3: '.',
    successAlertHelp: 'Keep up the excellent regularity!',
    studentProfile: 'Student Profile',
    registerNo: 'Register No',
    rollNo: 'Roll No',
    classSectionDetails: 'Class & Section details',
    year: 'Year',
    semester: 'Sem',
    section: 'Sec',
    attendanceStatus: 'Attendance Status',
    overallPercentage: 'Overall Percentage',
    shortage: 'Shortage / Defaulter',
    compliant: 'Compliant / Regular',
    totalDaysScheduled: 'Total Days Scheduled',
    conductedDays: 'Conducted days',
    classesAttended: 'Classes Attended',
    presentDays: 'Present days',
    classesMissed: 'Classes Missed',
    absentDays: 'Absent days',
    viewOnlyTitle: 'View-Only Portal Access',
    viewOnlyText: 'This dashboard provides a direct read-only view of attendance data from the campus database. Parents cannot request updates, edit attendance records, or modify any student profile details.',
    copyright: '© 2026 NITify Systems. Secure Parent Portal. All rights reserved.'
  },
  ta: {
    portalTitle: 'NITify',
    portalSubtitle: 'பெற்றோர் தளம்',
    logout: 'வெளியேறு',
    loadingText: 'மாணவரின் பாதுகாப்பான வருகைப் பதிவை அணுகுகிறது...',
    connectionFailure: 'இணைப்புத் தோல்வி',
    welcomeTitle: 'வணக்கம், {name}',
    welcomeSubtitle: 'உங்கள் குழந்தையின் வருகைப் பதிவு அறிக்கை இதோ.',
    refreshData: 'தரவை புதுப்பி',
    criticalAlertTitle: 'முக்கிய வருகைப் பதிவு எச்சரிக்கை',
    criticalAlertText1: 'உங்கள் குழந்தையின் வருகை விகிதம் தற்போது ',
    criticalAlertText2: ' ஆக உள்ளது, இது குறைந்தபட்சத் தேவையான ',
    criticalAlertText3: ' வரம்பை விடக் குறைவாக உள்ளது.',
    criticalAlertHelp: 'கல்வித் தடைகள் அல்லது அபராதங்களைத் தவிர்க்க வகுப்புகளுக்குத் தவறாமல் செல்ல உங்கள் குழந்தைக்கு அறிவுறுத்தவும்.',
    successAlertTitle: 'தேவையான வருகை விகிதம் எட்டப்பட்டது',
    successAlertText1: 'உங்கள் குழந்தை ',
    successAlertText2: ' வருகை விகிதத்துடன் நல்ல நிலையில் உள்ளது, இது குறைந்தபட்சத் தேவையான ',
    successAlertText3: ' வரம்பை பூர்த்தி செய்கிறது.',
    successAlertHelp: 'தொடர்ந்து வகுப்புகளுக்குச் செல்ல ஊக்குவிக்கவும்!',
    studentProfile: 'மாணவர் சுயவிவரம்',
    registerNo: 'பதிவு எண்',
    rollNo: 'வரிசை எண்',
    classSectionDetails: 'வகுப்பு மற்றும் பிரிவு விவரங்கள்',
    year: 'ஆண்டு',
    semester: 'பруவம்',
    section: 'பிரிவு',
    attendanceStatus: 'வருகைப் பதிவு நிலை',
    overallPercentage: 'ஒட்டுமொத்த சதவீதம்',
    shortage: 'குறைபாடு / வழக்கமற்றவர்',
    compliant: 'முறையான / இணக்கமானவர்',
    totalDaysScheduled: 'மொத்த வகுப்புகள்',
    conductedDays: 'நடத்தப்பட்ட நாட்கள்',
    classesAttended: 'வருகை தந்த வகுப்புகள்',
    presentDays: 'வந்த நாட்கள்',
    classesMissed: 'தவறிய வகுப்புகள்',
    absentDays: 'வராத நாட்கள்',
    viewOnlyTitle: 'பார்வைக்கு மட்டுமேயான அணுகல்',
    viewOnlyText: 'இந்தத் தளம் வளாகத் தரவுத்தளத்திலிருந்து வருகைப் பதிவுத் தரவை நேரடியாகப் பார்க்க மட்டுமே அனுமதிக்கும். பெற்றோரால் திருத்தங்கள் செய்யவோ, வருகைப் பதிவேட்டை மாற்றவோ அல்லது மாணவர் சுயவிவர விவரங்களை மாற்றவோ முடியாது.',
    copyright: '© 2026 NITify சிஸ்டம்ஸ். பாதுகாப்பான பெற்றோர் தளம். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.'
  },
  ml: {
    portalTitle: 'NITify',
    portalSubtitle: 'രക്ഷിതാക്കളുടെ പോർട്ടൽ',
    logout: 'ലോഗ് ഔട്ട്',
    loadingText: 'കുട്ടിയുടെ സുരക്ഷിതമായ ഹാജർ റെക്കോർഡ് പരിശോധിക്കുന്നു...',
    connectionFailure: 'കണക്ഷൻ പരാജയം',
    welcomeTitle: 'ഹലോ, {name}',
    welcomeSubtitle: 'നിങ്ങളുടെ കുട്ടിയുടെ തത്സമയ ഹാജർ റിപ്പോർട്ട് താഴെ നൽകുന്നു.',
    refreshData: 'വിവരങ്ങൾ പുതുക്കുക',
    criticalAlertTitle: 'ഹാജർ കുറവുള്ളതായി അറിയിപ്പ്',
    criticalAlertText1: 'നിങ്ങളുടെ കുട്ടിയുടെ ഹാജർ നിരക്ക് നിലവിൽ ',
    criticalAlertText2: ' ആണ്. ഇത് ആവശ്യമായ ഏറ്റവും കുറഞ്ഞ പരിധിയായ ',
    criticalAlertText3: ' എന്നതിലും കുറവാണ്.',
    criticalAlertHelp: 'അക്കാദമിക് നടപടികൾ ഒഴിവാക്കാൻ നിങ്ങളുടെ കുട്ടിയോട് പതിവായി ക്ലാസുകളിൽ പങ്കെടുക്കാൻ നിർദ്ദേശിക്കുക.',
    successAlertTitle: 'ആവശ്യമായ ഹാജർ ശതമാനമുണ്ട്',
    successAlertText1: 'നിങ്ങളുടെ കുട്ടിക്ക് ഹാജർ ആവശ്യത്തിനുണ്ട് (',
    successAlertText2: '). ഇത് ആവശ്യമായ ഏറ്റവും കുറഞ്ഞ പരിധിയായ ',
    successAlertText3: ' ശതമാനത്തിന് മുകളിലാണ്.',
    successAlertHelp: 'ഇതേ രീതിയിൽ മുന്നോട്ട് പോകുക!',
    studentProfile: 'വിദ്യാർത്ഥിയുടെ പ്രൊഫൈൽ',
    registerNo: 'രജിസ്റ്റർ നമ്പർ',
    rollNo: 'റോൾ നമ്പർ',
    classSectionDetails: 'ക്ലാസ് & സെക്ഷൻ വിവരങ്ങൾ',
    year: 'വർഷം',
    semester: 'സെമസ്റ്റർ',
    section: 'സെക്ഷൻ',
    attendanceStatus: 'ഹാജർ നില',
    overallPercentage: 'ആകെ ഹാജർ ശതമാനം',
    shortage: 'ഹാജർ കുറവുണ്ട്',
    compliant: 'ഹാജർ ആവശ്യത്തിനുണ്ട്',
    totalDaysScheduled: 'ആകെ അധ്യയന ദിനങ്ങൾ',
    conductedDays: 'ക്ലാസ് നടന്ന ദിനങ്ങൾ',
    classesAttended: 'പങ്കെടുത്ത ക്ലാസുകൾ',
    presentDays: 'ഹാജരായ ദിനങ്ങൾ',
    classesMissed: 'നഷ്ടപ്പെട്ട ക്ലാസുകൾ',
    absentDays: 'ഹാജരാകാത്ത ദിനങ്ങൾ',
    viewOnlyTitle: 'റീഡ്-ഓൺലി പോർട്ടൽ ആക്സസ്',
    viewOnlyText: 'ഈ പോർട്ടൽ ഹാജർ വിവരങ്ങൾ കാണാൻ മാത്രമേ അനുവദിക്കൂ. റിക്കോർഡുകൾ തിരുത്താനോ വിദ്യാർത്ഥികളുടെ വിവരങ്ങൾ തിരുത്താനോ രക്ഷിതാക്കൾക്ക് അനുവാദമില്ല.',
    copyright: '© 2026 NITify സിസ്റ്റംസ്. സെക്യുർ പേരന്റ് പോർട്ടൽ. എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.'
  }
};

function ParentDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState(localStorage.getItem('parentLang') || 'en');

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('parentLang', newLang);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(apiUrl('/api/attendance/parent-summary'), {
        headers: withAuthHeader()
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const student = data?.student || user?.linkedStudent;
  const attendancePercentage = data?.attendancePercentage ?? 0;
  const attendanceThreshold = data?.attendanceThreshold ?? 75;
  const isBelowThreshold = attendancePercentage < attendanceThreshold;

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans flex flex-col justify-between">
      <div>
        {/* Portal Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-slate-200 bg-white p-0.5 flex items-center justify-center shadow-sm">
              <img src="/logo.jpg" alt="NIT Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight leading-tight">
                {translations[lang].portalTitle}
              </h1>
              <p className="text-[10px] text-teal-650 font-extrabold tracking-wide uppercase mt-0.5">
                {translations[lang].portalSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="text-xs font-bold text-teal-900 bg-white border border-teal-200 rounded-lg py-2 px-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none cursor-pointer shadow-sm"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
            </select>
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 font-bold py-2 px-4 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" /> {translations[lang].logout}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
          {loading ? (
            <div className="text-center py-24 text-slate-400 font-bold animate-pulse flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-teal-650 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">{translations[lang].loadingText}</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-650 shrink-0" />
              <div>
                <h4 className="text-sm font-black">{translations[lang].connectionFailure}</h4>
                <p className="text-xs font-semibold text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Parent Welcome Message */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                    {translations[lang].welcomeTitle.replace('{name}', user?.name || (lang === 'ta' ? 'பெற்றோர்' : lang === 'ml' ? 'രക്ഷിതാവ്' : 'Parent'))}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {translations[lang].welcomeSubtitle}
                  </p>
                </div>
                <button
                  onClick={fetchAttendance}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  {translations[lang].refreshData}
                </button>
              </div>

              {/* Attendance Alert Card */}
              {isBelowThreshold ? (
                <div className="bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-200 p-5 rounded-2xl shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-rose-500 text-white p-3 rounded-xl shadow-md shadow-rose-500/10 animate-bounce">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-800">
                      {translations[lang].criticalAlertTitle}
                    </h3>
                    <p className="text-xs font-semibold text-rose-700 leading-relaxed mt-1">
                      {translations[lang].criticalAlertText1}
                      <span className="font-extrabold text-rose-650">{attendancePercentage}%</span>
                      {translations[lang].criticalAlertText2}
                      <span className="font-extrabold">{attendanceThreshold}%</span>
                      {translations[lang].criticalAlertText3}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-550 mt-1">
                      {translations[lang].criticalAlertHelp}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-emerald-500 text-white p-3 rounded-xl shadow-md shadow-emerald-500/10">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-800">
                      {translations[lang].successAlertTitle}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 leading-relaxed mt-1">
                      {translations[lang].successAlertText1}
                      <span className="font-extrabold">{attendancePercentage}%</span>
                      {translations[lang].successAlertText2}
                      <span className="font-extrabold">{attendanceThreshold}%</span>
                      {translations[lang].successAlertText3}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                      {translations[lang].successAlertHelp}
                    </p>
                  </div>
                </div>
              )}

              {/* Child Info Card & Main Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Child Dossier Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center gap-2 text-teal-300 text-[10px] font-bold uppercase tracking-wider mb-3">
                      <User className="w-4 h-4 text-teal-400" />
                      <span>{translations[lang].studentProfile}</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{student?.name}</h2>
                    <p className="text-xs text-teal-200/90 font-bold mt-1 tracking-wide">
                      {translations[lang].registerNo}: <span className="font-mono">{student?.registerNumber}</span> {student?.rollNumber ? `| ${translations[lang].rollNo}: ${student.rollNumber}` : ''}
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-6">
                    <span className="block text-[9px] uppercase font-bold text-teal-400 tracking-wider">
                      {translations[lang].classSectionDetails}
                    </span>
                    <p className="text-sm font-bold mt-1">
                      {student?.department} — {translations[lang].year} {student?.year} | {translations[lang].semester} {student?.semester} | {translations[lang].section} {student?.section}
                    </p>
                  </div>
                </div>

                {/* Overall Attendance Percentage Gauge */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {translations[lang].attendanceStatus}
                    </span>
                    <h3 className="text-base font-black text-slate-800 mt-1">
                      {translations[lang].overallPercentage}
                    </h3>
                  </div>

                  <div className="my-6 relative flex items-center justify-center">
                    {/* Visual Progress Arc or Circular Ring */}
                    <div className="w-28 h-28 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
                      <span className={`text-3xl font-black ${isBelowThreshold ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {attendancePercentage}%
                      </span>
                      {/* Colored absolute circle overlay */}
                      <div className={`absolute inset-[-8px] rounded-full border-8 border-transparent transition-all duration-500 ${
                        isBelowThreshold ? 'border-t-rose-500 border-r-rose-500' : 'border-t-emerald-500 border-r-emerald-500 border-l-emerald-500'
                      }`}></div>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isBelowThreshold 
                      ? 'bg-rose-50 border-rose-200 text-rose-700' 
                      : 'bg-emerald-50 border-emerald-250 text-emerald-700'
                  }`}>
                    {isBelowThreshold ? translations[lang].shortage : translations[lang].compliant}
                  </span>
                </div>

              </div>

              {/* Attendance Breakdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Total Working Days */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translations[lang].totalDaysScheduled}
                    </span>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{data?.totalWorkingDays ?? 0}</p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                      {translations[lang].conductedDays}
                    </p>
                  </div>
                </div>

                {/* Days Attended */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translations[lang].classesAttended}
                    </span>
                    <p className="text-xl font-black text-slate-850 mt-0.5">{data?.daysPresent ?? 0}</p>
                    <p className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                      {translations[lang].presentDays}
                    </p>
                  </div>
                </div>

                {/* Days Absent */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {translations[lang].classesMissed}
                    </span>
                    <p className="text-xl font-black text-rose-600 mt-0.5">
                      {Math.max(0, (data?.totalWorkingDays ?? 0) - (data?.daysPresent ?? 0))}
                    </p>
                    <p className="text-[9px] font-semibold text-rose-550 mt-0.5">
                      {translations[lang].absentDays}
                    </p>
                  </div>
                </div>

              </div>

            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-[10px] text-slate-400 font-bold border-t border-slate-100/50 mt-10">
        {translations[lang].copyright}
      </footer>
    </div>
  );
}

export default ParentDashboard;
