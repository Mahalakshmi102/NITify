import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PrincipalDashboard from './pages/PrincipalDashboard';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import HODDashboard from './pages/HODDashboard';
import ClassAdvisorDashboard from './pages/ClassAdvisorDashboard';
import ParentDashboard from './pages/ParentDashboard';
import StudentDashboard from './pages/StudentDashboard';
import './index.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const adminRoles = ['admin', 'coe'];
  const userRole = user.role.toLowerCase();

  let hasAccess = false;
  if (allowedRoles.includes('admin') && adminRoles.includes(userRole)) hasAccess = true;
  if (allowedRoles.includes('principal') && userRole === 'principal') hasAccess = true;
  if (allowedRoles.includes('parent') && userRole === 'parent') hasAccess = true;
  if (allowedRoles.includes('advisor') && (userRole === 'class advisor' || (userRole === 'faculty' && user.classAdvisorDetails?.isClassAdvisor))) hasAccess = true;
  if (allowedRoles.includes(userRole)) hasAccess = true;

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/principal/*" 
        element={
          <ProtectedRoute allowedRoles={['principal']}>
            <PrincipalDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/hod/*" 
        element={
          <ProtectedRoute allowedRoles={['hod']}>
            <HODDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/advisor/*" 
        element={
          <ProtectedRoute allowedRoles={['advisor']}>
            <ClassAdvisorDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/parent/*" 
        element={
          <ProtectedRoute allowedRoles={['parent']}>
            <ParentDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/*" 
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
