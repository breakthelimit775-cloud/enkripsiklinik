import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PasienPage from './pages/PasienPage';
import DokterPage from './pages/DokterPage';
import RekamMedisPage from './pages/RekamMedisPage';

// Route yang membutuhkan autentikasi
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#0f1117', flexDirection:'column', gap:'16px'
      }}>
        <div style={{
          width:'48px',height:'48px',borderRadius:'14px',
          background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 0 30px rgba(79,70,229,0.4)'
        }}>
          <span style={{fontSize:'22px'}}>🔐</span>
        </div>
        <div style={{
          width:'24px',height:'24px',
          border:'3px solid rgba(79,70,229,0.2)',
          borderTopColor:'#4f46e5',
          borderRadius:'50%',
          animation:'spin 0.8s linear infinite'
        }}/>
        <p style={{color:'#8892aa',fontSize:'0.875rem'}}>Memverifikasi sesi...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <MainLayout>{children}</MainLayout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace/> : <LoginPage/>}/>
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage/></ProtectedRoute>}/>
      <Route path="/pasien"    element={<ProtectedRoute><PasienPage/></ProtectedRoute>}/>
      <Route path="/dokter"    element={<ProtectedRoute><DokterPage/></ProtectedRoute>}/>
      <Route path="/rekam-medis" element={<ProtectedRoute><RekamMedisPage/></ProtectedRoute>}/>
      <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
