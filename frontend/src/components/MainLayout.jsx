import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Stethoscope, FileText,
  LogOut, Shield, ChevronRight, Menu, X, Lock
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pasien',       icon: Users,            label: 'Pasien' },
  { to: '/dokter',       icon: Stethoscope,      label: 'Dokter' },
  { to: '/rekam-medis',  icon: FileText,         label: 'Rekam Medis' },
];

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{display:'flex', minHeight:'100vh', background:'#0f1117'}}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '68px',
        minHeight:'100vh',
        background:'rgba(26,29,39,0.95)',
        borderRight:'1px solid #2a2d3e',
        display:'flex', flexDirection:'column',
        transition:'width 0.3s ease',
        overflow:'hidden',
        flexShrink:0,
        position:'sticky', top:0, height:'100vh',
      }}>
        {/* Brand */}
        <div style={{
          padding: sidebarOpen ? '20px 20px 16px' : '20px 12px 16px',
          borderBottom:'1px solid #2a2d3e',
          display:'flex', alignItems:'center', gap:'12px',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
        }}>
          {sidebarOpen && (
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{
                width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                background:'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Shield size={18} color="white"/>
              </div>
              <div>
                <div style={{fontWeight:'800', fontSize:'0.95rem', lineHeight:1}}>KlinikCipher</div>
                <div style={{fontSize:'0.68rem', color:'#34d399', marginTop:'3px', display:'flex', alignItems:'center', gap:'4px'}}>
                  <Lock size={9}/> ChaCha20 Active
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            style={{background:'none', border:'none', color:'#8892aa', cursor:'pointer', padding:'4px', borderRadius:'6px', flexShrink:0}}
          >
            {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>

        {/* Nav */}
        <nav style={{padding:'12px 10px', flex:1}}>
          {navItems.map(({to, icon:Icon, label}) => (
            <NavLink
              key={to}
              to={to}
              style={({isActive}) => ({
                display:'flex', alignItems:'center',
                gap:'12px',
                padding: sidebarOpen ? '10px 12px' : '10px',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                borderRadius:'10px',
                marginBottom:'4px',
                textDecoration:'none',
                fontSize:'0.875rem',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#818cf8' : '#8892aa',
                background: isActive ? 'rgba(79,70,229,0.12)' : 'transparent',
                transition:'all 0.2s',
                borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
              })}
              title={!sidebarOpen ? label : undefined}
            >
              {({isActive}) => (
                <>
                  <Icon size={18} color={isActive ? '#818cf8' : '#8892aa'} style={{flexShrink:0}}/>
                  {sidebarOpen && (
                    <>
                      <span style={{flex:1}}>{label}</span>
                      {isActive && <ChevronRight size={14}/>}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div style={{padding:'12px 10px', borderTop:'1px solid #2a2d3e'}}>
          {sidebarOpen && user && (
            <div style={{
              padding:'10px 12px', borderRadius:'10px',
              background:'rgba(255,255,255,0.04)',
              marginBottom:'8px'
            }}>
              <div style={{fontSize:'0.8rem', fontWeight:'600'}}>{user.username}</div>
              <div style={{fontSize:'0.72rem', color:'#8892aa', textTransform:'capitalize'}}>{user.role}</div>
            </div>
          )}
          <button
            id="btn-logout"
            onClick={handleLogout}
            style={{
              display:'flex', alignItems:'center', gap:'10px',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              width:'100%', padding:'10px 12px',
              background:'none', border:'none', borderRadius:'10px',
              color:'#f87171', cursor:'pointer', fontSize:'0.875rem', fontWeight:'500',
              transition:'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(220,38,38,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
          >
            <LogOut size={16} style={{flexShrink:0}}/>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{flex:1, overflow:'auto', padding:'28px'}}>
        {children}
      </main>
    </div>
  );
}
