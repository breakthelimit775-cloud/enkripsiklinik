import { useEffect, useState, useRef } from 'react';
import { getPasiens, createPasien, deletePasien } from '../services/api';
import { Users, Plus, Trash2, Lock, X, AlertCircle, Eye, EyeOff, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function AddPasienModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ nama_pasien:'', nik:'', no_hp:'', alamat:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    return () => { mounted.current = false; }; // cleanup saat unmount
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createPasien(form);
      // Panggil callback dulu SEBELUM close agar parent bisa update data
      onSuccess('Pasien berhasil ditambahkan! NIK telah dienkripsi dengan ChaCha20.');
      onClose();
    } catch (err) {
      if (mounted.current) {
        setError(err.response?.data?.message || 'Gagal menambahkan pasien.');
        setLoading(false);
      }
    }
    // Tidak perlu finally — jika sukses modal sudah unmount
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, backdropFilter:'blur(4px)'
    }}>
      <div className="glass-card fade-in" style={{width:'100%', maxWidth:'480px', padding:'28px', margin:'20px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px'}}>
          <div>
            <h2 style={{fontWeight:'700', fontSize:'1.1rem'}}>Tambah Pasien Baru</h2>
            <p style={{color:'#8892aa', fontSize:'0.8rem', marginTop:'4px'}}>
              NIK akan dienkripsi sebelum disimpan
            </p>
          </div>
          <button onClick={onClose} style={{background:'none', border:'none', color:'#8892aa', cursor:'pointer', padding:'6px', borderRadius:'8px'}}>
            <X size={20}/>
          </button>
        </div>

        <div style={{
          display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px',
          borderRadius:'10px', background:'rgba(79,70,229,0.08)', border:'1px solid rgba(79,70,229,0.2)',
          marginBottom:'20px'
        }}>
          <Lock size={13} color="#818cf8"/>
          <p style={{fontSize:'0.78rem', color:'#818cf8'}}>
            Field <strong>NIK</strong> akan otomatis dienkripsi dengan <strong>ChaCha20</strong> menggunakan kunci jaringan (MAC+IP)
          </p>
        </div>

        {error && (
          <div style={{
            display:'flex', gap:'8px', alignItems:'center', padding:'10px 14px',
            borderRadius:'10px', background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)',
            marginBottom:'16px', color:'#f87171', fontSize:'0.83rem'
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{display:'grid', gap:'16px'}}>
            <div>
              <label className="form-label">Nama Pasien</label>
              <input id="pasien-nama" className="form-input" type="text" placeholder="Nama lengkap pasien"
                value={form.nama_pasien} onChange={e => setForm(p=>({...p, nama_pasien:e.target.value}))} required/>
            </div>
            <div>
              <label className="form-label" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <Lock size={10} color="#818cf8"/>
                NIK (Nomor Induk Kependudukan) — <span style={{color:'#818cf8'}}>TERENKRIPSI</span>
              </label>
              <input id="pasien-nik" className="form-input" type="text"
                placeholder="16 digit NIK" maxLength={16}
                value={form.nik} onChange={e => setForm(p=>({...p, nik:e.target.value}))} required/>
            </div>
            <div>
              <label className="form-label">Nomor HP</label>
              <input id="pasien-nohp" className="form-input" type="tel" placeholder="08xxxxxxxxxx"
                value={form.no_hp} onChange={e => setForm(p=>({...p, no_hp:e.target.value}))} required/>
            </div>
            <div>
              <label className="form-label">Alamat</label>
              <textarea id="pasien-alamat" className="form-input" placeholder="Alamat lengkap" rows={3}
                value={form.alamat} onChange={e => setForm(p=>({...p, alamat:e.target.value}))} required/>
            </div>
          </div>

          <div style={{display:'flex', gap:'12px', marginTop:'24px', justifyContent:'flex-end'}}>
            <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
            <button id="btn-submit-pasien" type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width:'14px',height:'14px',borderWidth:'2px'}}/> : <Lock size={14}/>}
              {loading ? 'Menyimpan...' : 'Simpan & Enkripsi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PasienPage() {
  const [pasiens, setPasiens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [visibleNiks, setVisibleNiks] = useState(new Set());

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = () => {
    setLoading(true);
    setFetchError('');
    getPasiens()
      .then(res => {
        // Gunakan optional chaining + fallback array untuk cegah crash
        const data = res.data?.data;
        setPasiens(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Gagal memuat data pasien. Cek koneksi backend.';
        setFetchError(msg);
        setPasiens([]); // pastikan selalu array, jangan undefined
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Hapus pasien "${nama}"?`)) return;
    try {
      await deletePasien(id);
      showToast(`Pasien "${nama}" berhasil dihapus.`);
      fetchData();
    } catch {
      showToast('Gagal menghapus pasien.', 'error');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();
    const tglCetak = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const jamCetak = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // === HEADER ===
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pageW, 30, 'F');

    doc.setTextColor(199, 210, 254);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN DATA PASIEN', pageW / 2, 12, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Sistem Informasi Klinik — Data NIK Terdekripsi (ChaCha20)', pageW / 2, 19, { align: 'center' });
    doc.text(`Dicetak: ${tglCetak}, ${jamCetak}`, pageW / 2, 25, { align: 'center' });

    // === TABEL ===
    const tableRows = pasiens.map((p, i) => [
      i + 1,
      p.nama_pasien || '-',
      p.nik || '[GAGAL DEKRIPSI]',
      p.no_hp || '-',
      p.alamat || '-',
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['No', 'Nama Pasien', 'NIK (Terdekripsi)', 'No. HP', 'Alamat']],
      body: tableRows,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        halign: 'left',
        valign: 'middle',
        textColor: [30, 27, 75],
        lineColor: [199, 210, 254],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 55 },
        2: { cellWidth: 45, fontStyle: 'bold', textColor: [79, 70, 229] },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer
        const pgCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Halaman ${data.pageNumber} dari ${pgCount} — Rahasia Medis`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      },
    });

    // === RINGKASAN ===
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Pasien: ${pasiens.length} orang`, 14, finalY);
    doc.text('* NIK pada dokumen ini adalah data terdekrip — DOKUMEN RAHASIA', 14, finalY + 5);

    doc.save(`laporan_pasien_dekripsi_${now.toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {showModal && (
        <AddPasienModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            setShowModal(false); // tutup modal dulu
            showToast(msg);
            fetchData();         // lalu refresh data
          }}
        />
      )}

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'1.5rem', fontWeight:'800', marginBottom:'4px'}}>
            Modul <span className="gradient-text">Pasien</span>
          </h1>
          <p style={{color:'#8892aa', fontSize:'0.82rem'}}>
            Data NIK tersimpan dalam bentuk ciphertext ChaCha20 di database
          </p>
        </div>
        <div style={{display:'flex', gap:'12px'}}>
          <button className="btn-secondary" onClick={exportPDF} style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <Download size={16}/> Export PDF
          </button>
          <button id="btn-tambah-pasien" className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16}/> Tambah Pasien
          </button>
        </div>
      </div>

      {/* Error banner saat fetch gagal */}
      {fetchError && !loading && (
        <div style={{
          display:'flex', gap:'8px', alignItems:'center', padding:'12px 16px',
          borderRadius:'10px', background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)',
          marginBottom:'16px', color:'#f87171', fontSize:'0.83rem'
        }}>
          <AlertCircle size={14}/> {fetchError}
        </div>
      )}

      {/* Table Card */}
      <div className="glass-card" style={{overflow:'hidden'}}>
        <div style={{padding:'16px 20px', borderBottom:'1px solid #2a2d3e', display:'flex', alignItems:'center', gap:'10px'}}>
          <Users size={16} color="#8892aa"/>
          <span style={{fontWeight:'600', fontSize:'0.875rem'}}>Daftar Pasien</span>
          <span className="badge badge-primary" style={{marginLeft:'auto'}}>{pasiens.length} Data</span>
          <span className="enc-badge"><Lock size={9}/> NIK Terenkripsi</span>
        </div>

        {loading ? (
          <div style={{padding:'60px', display:'flex', justifyContent:'center', alignItems:'center', gap:'12px', color:'#8892aa'}}>
            <div className="spinner"/>
            <span>Memuat & mendekripsi data...</span>
          </div>
        ) : pasiens.length === 0 ? (
          <div style={{padding:'60px', textAlign:'center', color:'#8892aa'}}>
            <Users size={40} style={{margin:'0 auto 12px', opacity:0.3}}/>
            <p>Belum ada data pasien. Klik "Tambah Pasien" untuk menambahkan.</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama Pasien</th>
                  <th>
                    <span style={{display:'flex', alignItems:'center', gap:'5px'}}>
                      <Lock size={10}/> NIK <span className="enc-badge" style={{marginLeft:'4px'}}>Dekripsi</span>
                    </span>
                  </th>
                  <th>No. HP</th>
                  <th>Alamat</th>
                  <th style={{textAlign:'center'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pasiens.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{color:'#8892aa', fontWeight:'600'}}>{i+1}</td>
                    <td style={{fontWeight:'600'}}>{p.nama_pasien}</td>
                    <td style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <code style={{
                        background:'rgba(79,70,229,0.1)', color:'#818cf8',
                        padding:'3px 8px', borderRadius:'6px', fontSize:'0.82rem',
                        fontFamily:'monospace', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block'
                      }} title={visibleNiks.has(p.id) ? p.nik : p.nik_cipher}>
                        {visibleNiks.has(p.id) ? p.nik : (p.nik_cipher || '****************')}
                      </code>
                      <button 
                        onClick={() => {
                          setVisibleNiks(prev => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }}
                        style={{background:'none', border:'none', cursor:'pointer', color:'#8892aa', padding: '2px'}}
                        title={visibleNiks.has(p.id) ? "Sembunyikan" : "Tampilkan Dekripsi"}
                      >
                        {visibleNiks.has(p.id) ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </td>
                    <td>{p.no_hp}</td>
                    <td style={{color:'#8892aa', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {p.alamat}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(p.id, p.nama_pasien)}
                        title="Hapus pasien"
                      >
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
