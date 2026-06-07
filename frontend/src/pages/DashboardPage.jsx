import { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { Users, Stethoscope, FileText, Activity, Shield, Cpu, Lock, Key } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, gradient, delay = 0 }) {
  return (
    <div
      className="glass-card fade-in"
      style={{
        padding:'24px', position:'relative', overflow:'hidden',
        animation: `fadeIn 0.4s ease-out ${delay}s both`,
      }}
    >
      <div style={{
        position:'absolute', top:'-20px', right:'-20px',
        width:'100px', height:'100px', borderRadius:'50%',
        background: gradient, opacity:0.12, pointerEvents:'none'
      }}/>
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
        <div>
          <p style={{color:'#8892aa', fontSize:'0.78rem', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.05em'}}>
            {label}
          </p>
          <p style={{fontSize:'2.4rem', fontWeight:'800', lineHeight:1.1, marginTop:'8px', color}}>
            {value ?? '—'}
          </p>
        </div>
        <div style={{
          width:'48px', height:'48px', borderRadius:'14px', flexShrink:0,
          background: gradient, display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon size={22} color="white"/>
        </div>
      </div>
    </div>
  );
}

function EncryptionInfoCard({ info }) {
  if (!info) return null;
  const rows = [
    { label:'Cipher Algorithm',      value: info.cipher?.toUpperCase(),  icon:'🔐' },
    { label:'Key Generation',        value: info.algoritma_key,           icon:'🔑' },
    { label:'Server MAC Address',    value: info.mac_address,             icon:'🌐' },
    { label:'Client IP (Browser)',   value: info.client_ip,               icon:'📡' },
    { label:'Server IP (WiFi/LAN)',  value: info.server_local_ip,         icon:'📶' },
    { label:'Key Material (MAC+IP)', value: info.key_material,            icon:'🧩' },
    { label:'Final Key (Hash 256)',  value: info.key_sha256_hex,          icon:'🛡️' },
    { label:'Key Length',            value: info.key_length,              icon:'📏' },
  ];
  return (
    <div className="glass-card fade-in" style={{padding:'24px', animation:'fadeIn 0.5s ease-out 0.4s both'}}>
      <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px'}}>
        <div style={{
          width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
          background:'linear-gradient(135deg, #059669, #10b981)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Shield size={18} color="white"/>
        </div>
        <div>
          <h3 style={{fontWeight:'700', fontSize:'0.95rem'}}>Status Enkripsi Sistem</h3>
          <p style={{color:'#8892aa', fontSize:'0.78rem'}}>Konfigurasi keamanan aktif saat ini</p>
        </div>
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
          <span style={{fontSize:'0.7rem', color:'#10b981', fontWeight:'bold', letterSpacing:'1px'}} className="animate-pulse">
            REAL-TIME DETECT
          </span>
          <span className="badge badge-green">● AKTIF</span>
        </div>
      </div>

      <div style={{display:'grid', gap:'8px'}}>
        {rows.map(({label, value, icon}) => (
          <div key={label} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 14px', borderRadius:'10px',
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)'
          }}>
            <span style={{color:'#8892aa', fontSize:'0.82rem', display:'flex', gap:'8px', alignItems:'center'}}>
              <span>{icon}</span>{label}
            </span>
            <code style={{
              color:'#e2e8f0', fontSize:'0.8rem', fontFamily:'monospace',
              background:'rgba(79,70,229,0.1)', padding:'2px 8px', borderRadius:'6px',
              maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
            }} title={value}>{value || '—'}</code>
          </div>
        ))}
      </div>

      <div style={{
        marginTop:'16px', padding:'12px 14px', borderRadius:'10px',
        background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)',
        display:'flex', alignItems:'flex-start', gap:'10px'
      }}>
        <Lock size={14} color="#34d399" style={{marginTop:'2px', flexShrink:0}}/>
        <p style={{fontSize:'0.78rem', color:'#6ee7b7', lineHeight:1.6}}>
          Kunci enkripsi dibuat secara <strong>otomatis</strong> dari kombinasi MAC Address server
          dan IP client, lalu di-hash menggunakan SHA-256 menjadi kunci 256-bit.
          Data <strong>NIK Pasien</strong>, <strong>Diagnosa</strong>, dan <strong>Resep Obat</strong> tersimpan sebagai ciphertext di database.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = () => {
      getDashboardStats()
        .then(res => {
          setStats(res.data.data);
          setError('');
        })
        .catch(() => setError('Gagal memuat data dashboard.'))
        .finally(() => setLoading(false));
    };

    fetchStats(); // Load pertama kali
    const intervalId = setInterval(fetchStats, 2000); // Polling setiap 2 detik untuk deteksi real-time

    return () => clearInterval(intervalId); // Cleanup saat pindah halaman
  }, []);

  if (loading) return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div className="spinner" style={{margin:'0 auto 16px'}}/>
        <p style={{color:'#8892aa'}}>Memuat dashboard...</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:'28px'}}>
        <h1 style={{fontSize:'1.6rem', fontWeight:'800', marginBottom:'6px'}}>
          Dashboard <span className="gradient-text">Klinik</span>
        </h1>
        <p style={{color:'#8892aa', fontSize:'0.875rem'}}>
          Selamat datang! Berikut ringkasan data sistem klinik Anda.
        </p>
      </div>

      {error && (
        <div className="toast toast-error" style={{position:'static', marginBottom:'20px'}}>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',
        gap:'16px', marginBottom:'24px'
      }}>
        <StatCard
          icon={Users} label="Total Pasien" value={stats?.jumlah_pasien}
          color="#818cf8" gradient="linear-gradient(135deg,#4f46e5,#7c3aed)" delay={0}
        />
        <StatCard
          icon={Stethoscope} label="Total Dokter" value={stats?.jumlah_dokter}
          color="#22d3ee" gradient="linear-gradient(135deg,#0891b2,#06b6d4)" delay={0.1}
        />
        <StatCard
          icon={FileText} label="Total Rekam Medis" value={stats?.jumlah_rekam_medis}
          color="#34d399" gradient="linear-gradient(135deg,#059669,#10b981)" delay={0.2}
        />
        <StatCard
          icon={Activity} label="Kunjungan Hari Ini" value={stats?.kunjungan_hari_ini}
          color="#fbbf24" gradient="linear-gradient(135deg,#d97706,#f59e0b)" delay={0.3}
        />
      </div>

      {/* Encryption Status Card */}
      <EncryptionInfoCard info={stats?.enkripsi_info} />
    </div>
  );
}
