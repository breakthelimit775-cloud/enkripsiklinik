import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, Eye, EyeOff, Cpu } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background:'#0f1117'}}>
      {/* Ambient background blobs */}
      <div style={{
        position:'absolute', top:'-120px', left:'-120px',
        width:'450px', height:'450px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
        pointerEvents:'none'
      }}/>
      <div style={{
        position:'absolute', bottom:'-100px', right:'-80px',
        width:'380px', height:'380px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
        pointerEvents:'none'
      }}/>

      <div className="fade-in" style={{width:'100%', maxWidth:'420px', padding:'24px'}}>
        {/* Logo & Title */}
        <div style={{textAlign:'center', marginBottom:'36px'}}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'72px', height:'72px', borderRadius:'20px', marginBottom:'16px',
            background:'linear-gradient(135deg, #4f46e5, #7c3aed)',
            boxShadow:'0 0 30px rgba(79,70,229,0.5)'
          }}>
            <Shield size={34} color="white" />
          </div>
          <h1 className="gradient-text" style={{fontSize:'1.8rem', fontWeight:'800', lineHeight:1.2, marginBottom:'8px'}}>
            KlinikCipher
          </h1>
          <p style={{color:'#8892aa', fontSize:'0.875rem'}}>
            Sistem Informasi Klinik dengan Enkripsi ChaCha20
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{padding:'32px'}}>
          <h2 style={{fontSize:'1.1rem', fontWeight:'700', marginBottom:'6px'}}>Selamat Datang</h2>
          <p style={{color:'#8892aa', fontSize:'0.82rem', marginBottom:'28px'}}>
            Masuk ke akun Anda untuk melanjutkan
          </p>

          {error && (
            <div style={{
              background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)',
              borderRadius:'10px', padding:'12px 14px', marginBottom:'20px',
              color:'#f87171', fontSize:'0.83rem', display:'flex', alignItems:'center', gap:'8px'
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'18px'}}>
              <label className="form-label">
                <User size={12} style={{display:'inline', marginRight:'5px'}} />
                Username
              </label>
              <input
                id="login-username"
                className="form-input"
                type="text"
                placeholder="Masukkan username"
                value={form.username}
                onChange={e => setForm(p => ({...p, username: e.target.value}))}
                required
                autoFocus
              />
            </div>

            <div style={{marginBottom:'24px'}}>
              <label className="form-label">
                <Lock size={12} style={{display:'inline', marginRight:'5px'}} />
                Password
              </label>
              <div style={{position:'relative'}}>
                <input
                  id="login-password"
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  required
                  style={{paddingRight:'42px'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', color:'#8892aa', cursor:'pointer', padding:'4px'
                  }}
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button id="btn-login" className="btn-primary" type="submit" disabled={loading} style={{width:'100%', justifyContent:'center', padding:'12px'}}>
              {loading ? <span className="spinner" style={{width:'18px',height:'18px',borderWidth:'2px'}}/> : <Lock size={16}/>}
              {loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
            </button>
          </form>
        </div>

        {/* Encryption info badge */}
        <div style={{
          marginTop:'20px', textAlign:'center', display:'flex', alignItems:'center',
          justifyContent:'center', gap:'8px', color:'#8892aa', fontSize:'0.75rem'
        }}>
          <Cpu size={12} style={{color:'#34d399'}}/>
          <span>Enkripsi <strong style={{color:'#34d399'}}>ChaCha20</strong> aktif · Key: SHA-256(MAC + IP)</span>
        </div>

        <p style={{textAlign:'center', marginTop:'12px', color:'#8892aa', fontSize:'0.75rem'}}>
          Default: <code style={{color:'#818cf8'}}>admin</code> / <code style={{color:'#818cf8'}}>admin123</code>
        </p>
      </div>
    </div>
  );
}
