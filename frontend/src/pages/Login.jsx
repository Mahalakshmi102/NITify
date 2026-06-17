import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../api/http';
import { useAuth } from '../context/AuthContext';

const translations = {
  en: {
    registerNumberLabel: 'Student Register Number',
    registerNumberPlaceholder: 'Enter student register number',
    dobLabel: 'Student Date of Birth (DDMMYYYY)',
    dobPlaceholder: 'e.g. 15062004',
    infoText: "Use your ward's date of birth in DDMMYYYY format as the password.",
    loginBtn: 'Parent Login',
    loggingIn: 'Logging in...',
    errorInvalid: 'Invalid register number or date of birth.',
    errorGeneric: 'Failed to login. Please check your credentials.'
  },
  ta: {
    registerNumberLabel: 'மாணவர் பதிவு எண்',
    registerNumberPlaceholder: 'மாணவர் பதிவு எண்ணை உள்ளிடவும்',
    dobLabel: 'மாணவர் பிறந்த தேதி (DDMMYYYY)',
    dobPlaceholder: 'எ.கா. 15062004',
    infoText: "உங்கள் வார்டின் பிறந்த தேதியை DDMMYYYY வடிவத்தில் கடவுச்சொல்லாகப் பயன்படுத்தவும்.",
    loginBtn: 'பெற்றோர் உள்நுழைவு',
    loggingIn: 'உள்நுழைகிறது...',
    errorInvalid: 'தவறான பதிவு எண் அல்லது பிறந்த தேதி.',
    errorGeneric: 'உள்நுழைய முடியவில்லை. உங்கள் சான்றுகளைச் சரிபார்க்கவும்.'
  },
  ml: {
    registerNumberLabel: 'വിദ്യാർത്ഥിയുടെ രജിസ്റ്റർ നമ്പർ',
    registerNumberPlaceholder: 'വിദ്യാർത്ഥിയുടെ രജിസ്റ്റർ നമ്പർ നൽകുക',
    dobLabel: 'വിദ്യാർത്ഥിയുടെ ജനനത്തീയതി (DDMMYYYY)',
    dobPlaceholder: 'ഉദാ. 15062004',
    infoText: "നിങ്ങളുടെ വാർഡിന്റെ ജനനത്തീയതി DDMMYYYY ഫോർമാറ്റിൽ പാസ്‌വേഡായി ഉപയോഗിക്കുക.",
    loginBtn: 'രക്ഷിതാക്കളുടെ ലോഗിൻ',
    loggingIn: 'ലോഗിൻ ചെയ്യുന്നു...',
    errorInvalid: 'തെറ്റായ രജിസ്റ്റർ നമ്പർ അല്ലെങ്കിൽ ജനനത്തീയതി.',
    errorGeneric: 'ലോഗിൻ ചെയ്യാൻ കഴിഞ്ഞില്ല. നിങ്ങളുടെ യോഗ്യതാപത്രങ്ങൾ പരിശോധിക്കുക.'
  }
};

function Login() {
  const { login } = useAuth();
  const [loginMode, setLoginMode] = useState('staff');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('parentLang') || 'en');
  const navigate = useNavigate();

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/auth/login'), {
        email: identifier,
        password
      });

      const { token, user } = response.data;
      const userRole = user.role.toLowerCase();
      
      login(token, user);

      if (user.isFirstLogin) {
        navigate('/change-password');
        return;
      }

      if (['admin', 'coe'].includes(userRole)) {
        navigate('/admin');
      } else if (userRole === 'principal') {
        navigate('/principal');
      } else if (userRole === 'hod') {
        navigate('/hod');
      } else if (userRole === 'class advisor' || (userRole === 'faculty' && user.classAdvisorDetails?.isClassAdvisor)) {
        navigate('/advisor');
      } else if (userRole === 'faculty') {
        setError('Faculty dashboard has been removed. Class Advisors should use the Class Advisor login.');
        return;
      } else if (userRole === 'student') {
        navigate('/student');
      } else {
        setError('Access Denied: Invalid role.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/auth/parent-login'), {
        registerNumber,
        dob
      });

      const { token, user } = response.data;
      login(token, user);
      navigate('/parent');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('register number') || msg.toLowerCase().includes('date of birth') || msg.toLowerCase().includes('incorrect')) {
        setError(translations[lang].errorInvalid);
      } else if (msg) {
        setError(msg);
      } else {
        setError(translations[lang].errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div 
        className="absolute inset-0 bg-cover bg-bottom animate-unblur-zoom"
        style={{ backgroundImage: "url('/background.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/70 via-slate-900/30 to-slate-950/75" />
      
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-white/20 relative z-10 transition-all duration-300 hover:shadow-indigo-500/5">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-white p-1 flex items-center justify-center shadow-lg border border-slate-100 hover:scale-105 transition-transform duration-300">
            <img src="/logo.jpg" alt="NIT Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-3xl font-black text-center bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent mt-3">NITify</h1>
        </div>

        <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setLoginMode('staff'); setError(''); }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition ${loginMode === 'staff' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
          >
            Staff / Student
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('parent'); setError(''); }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition ${loginMode === 'parent' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
          >
            Parent Login
          </button>
        </div>
        
        {loginMode === 'parent' && (
          <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-teal-50/50 border border-teal-100 rounded-xl">
            <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wide">Language / மொழி / ഭാഷ:</span>
            <select
              value={lang}
              onChange={(e) => { const l = e.target.value; setLang(l); localStorage.setItem('parentLang', l); setError(''); }}
              className="text-xs font-bold text-teal-900 bg-white border border-teal-200 rounded-lg py-1 px-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none cursor-pointer shadow-sm"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative mb-4 text-xs font-bold" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {loginMode === 'staff' ? (
          <form onSubmit={handleStaffLogin} className="space-y-4 text-xs font-semibold text-slate-500">
            <div>
              <label className="block text-slate-650 font-bold mb-2 uppercase tracking-wide">Email ID / Register Number</label>
              <input 
                type="text" 
                placeholder="Enter your email or register number" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-slate-650 font-bold mb-2 uppercase tracking-wide">Password</label>
              <input 
                type="password" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
                required
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <a href="/forgot-password" className="text-xs text-blue-600 font-extrabold hover:underline">Forgot password?</a>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full text-white font-extrabold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'}`}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleParentLogin} className="space-y-4 text-xs font-semibold text-slate-500">
            <div>
              <label className="block text-slate-650 font-bold mb-2 uppercase tracking-wide">
                {translations[lang].registerNumberLabel}
              </label>
              <input 
                type="text" 
                placeholder={translations[lang].registerNumberPlaceholder}
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-slate-650 font-bold mb-2 uppercase tracking-wide">
                {translations[lang].dobLabel}
              </label>
              <input 
                type="password" 
                placeholder={translations[lang].dobPlaceholder}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 shadow-sm"
                required
                maxLength={8}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {translations[lang].infoText}
            </p>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full text-white font-extrabold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg ${loading ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/10'}`}
            >
              {loading ? translations[lang].loggingIn : translations[lang].loginBtn}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
