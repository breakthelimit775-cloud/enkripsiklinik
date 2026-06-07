import { useEffect, useState, useRef } from 'react';
import { getDokters, createDokter, deleteDokter } from '../services/api';
import { Stethoscope, Plus, Trash2, X, AlertCircle } from 'lucide-react';

const spesialisList = [
  'Umum', 'Penyakit Dalam', 'Anak', 'Bedah Umum', 'Jantung',
  'Saraf', 'Kulit & Kelamin', 'Kandungan & Kebidanan', 'Mata',
  'THT', 'Ortopedi', 'Gigi & Mulut', 'Paru', 'Psikiatri',
];

function AddDokterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ nama_dokter:'', spesialis:'', no_hp:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createDokter(form);
      onSuccess('Dokter berhasil ditambahkan.');
      onClose();
    } catch (err) {
      if (mounted.current) {
        setError(err.response?.data?.message || 'Gagal menambahkan dokter.');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}>
      <div className="glass-card fade-in" style={{width:'100%',maxWidth:'440px',padding:'28px',margin:'20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <h2 style={{fontWeight:'700',fontSize:'1.1rem'}}>Tambah Dokter</h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#8892aa',cursor:'pointer',padding:'6px',borderRadius:'8px'}}><X size={20}/></button>
        </div>
        {error && (
          <div style={{display:'flex',gap:'8px',alignItems:'center',padding:'10px 14px',borderRadius:'10px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',marginBottom:'16px',color:'#f87171',fontSize:'0.83rem'}}>
            <AlertCircle size={14}/> {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{display:'grid',gap:'16px'}}>
            <div>
              <label className="form-label">Nama Dokter (dengan gelar)</label>
              <input id="dokter-nama" className="form-input" type="text" placeholder="Dr. Nama Lengkap, Sp.XX"
                value={form.nama_dokter} onChange={e=>setForm(p=>({...p,nama_dokter:e.target.value}))} required/>
            </div>
            <div>
              <label className="form-label">Spesialis</label>
              <select id="dokter-spesialis" className="form-input"
                value={form.spesialis} onChange={e=>setForm(p=>({...p,spesialis:e.target.value}))} required>
                <option value="">Pilih Spesialis</option>
                {spesialisList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">No. HP (opsional)</label>
              <input id="dokter-nohp" className="form-input" type="tel" placeholder="08xxxxxxxxxx"
                value={form.no_hp} onChange={e=>setForm(p=>({...p,no_hp:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:'flex',gap:'12px',marginTop:'24px',justifyContent:'flex-end'}}>
            <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
            <button id="btn-submit-dokter" type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width:'14px',height:'14px',borderWidth:'2px'}}/> : <Plus size={14}/>}
              {loading ? 'Menyimpan...' : 'Simpan Dokter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DokterPage() {
  const [dokters, setDokters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [fetchError, setFetchError] = useState('');

  const showToast = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = () => {
    setLoading(true);
    setFetchError('');
    getDokters()
      .then(res => {
        const data = res.data?.data;
        setDokters(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Gagal memuat data dokter.';
        setFetchError(msg);
        setDokters([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Hapus dokter "${nama}"?`)) return;
    try {
      await deleteDokter(id);
      showToast(`Dokter "${nama}" berhasil dihapus.`);
      fetchData();
    } catch {
      showToast('Gagal menghapus dokter.', 'error');
    }
  };

  const spesialisColors = {
    'Umum': 'badge-cyan', 'Anak': 'badge-green', 'Jantung': 'badge-orange',
    'Penyakit Dalam': 'badge-primary',
  };
  const getBadgeClass = (sp) => spesialisColors[sp] || 'badge-cyan';

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      {showModal && (
        <AddDokterModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            setShowModal(false);
            showToast(msg);
            fetchData();
          }}
        />
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'1.5rem',fontWeight:'800',marginBottom:'4px'}}>
            Modul <span className="gradient-text">Dokter</span>
          </h1>
          <p style={{color:'#8892aa',fontSize:'0.82rem'}}>Kelola data dokter dan spesialisasi</p>
        </div>
        <button id="btn-tambah-dokter" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16}/> Tambah Dokter
        </button>
      </div>

      {fetchError && !loading && (
        <div style={{display:'flex',gap:'8px',alignItems:'center',padding:'12px 16px',borderRadius:'10px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',marginBottom:'16px',color:'#f87171',fontSize:'0.83rem'}}>
          <AlertCircle size={14}/> {fetchError}
        </div>
      )}

      <div className="glass-card" style={{overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #2a2d3e',display:'flex',alignItems:'center',gap:'10px'}}>
          <Stethoscope size={16} color="#8892aa"/>
          <span style={{fontWeight:'600',fontSize:'0.875rem'}}>Daftar Dokter</span>
          <span className="badge badge-cyan" style={{marginLeft:'auto'}}>{dokters.length} Dokter</span>
        </div>

        {loading ? (
          <div style={{padding:'60px',display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',color:'#8892aa'}}>
            <div className="spinner"/><span>Memuat data...</span>
          </div>
        ) : dokters.length === 0 ? (
          <div style={{padding:'60px',textAlign:'center',color:'#8892aa'}}>
            <Stethoscope size={40} style={{margin:'0 auto 12px',opacity:0.3}}/>
            <p>Belum ada data dokter.</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama Dokter</th>
                  <th>Spesialis</th>
                  <th>No. HP</th>
                  <th style={{textAlign:'center'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dokters.map((d, i) => (
                  <tr key={d.id}>
                    <td style={{color:'#8892aa',fontWeight:'600'}}>{i+1}</td>
                    <td style={{fontWeight:'600'}}>{d.nama_dokter}</td>
                    <td><span className={`badge ${getBadgeClass(d.spesialis)}`}>{d.spesialis}</span></td>
                    <td style={{color:'#8892aa'}}>{d.no_hp || '—'}</td>
                    <td style={{textAlign:'center'}}>
                      <button className="btn-danger" onClick={() => handleDelete(d.id, d.nama_dokter)}>
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
