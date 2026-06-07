import { useEffect, useState, useRef } from 'react';
import { getRekamMedis, createRekamMedis, deleteRekamMedis, getPasiens, getDokters } from '../services/api';
import { FileText, Plus, Trash2, Lock, X, AlertCircle, Calendar, Eye, EyeOff, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RichTextEditor from '../components/RichTextEditor';

// Strip HTML tags untuk PDF/plain text
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function AddRekamMedisModal({ onClose, onSuccess, pasiens, dokters }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    pasien_id:'', dokter_id:'', tgl_kunjungan:today, diagnosa:'', resep_obat:''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createRekamMedis(form);
      onSuccess('Rekam medis berhasil disimpan! Diagnosa telah dienkripsi ChaCha20.');
      onClose();
    } catch (err) {
      if (mounted.current) {
        setError(err.response?.data?.message || 'Gagal menyimpan rekam medis.');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)',overflowY:'auto',padding:'20px'}}>
      <div className="glass-card fade-in" style={{width:'100%',maxWidth:'520px',padding:'28px',margin:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <div>
            <h2 style={{fontWeight:'700',fontSize:'1.1rem'}}>Tambah Rekam Medis</h2>
            <p style={{color:'#8892aa',fontSize:'0.78rem',marginTop:'4px'}}>
              Diagnosa akan dienkripsi sebelum disimpan
            </p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#8892aa',cursor:'pointer',padding:'6px',borderRadius:'8px'}}><X size={20}/></button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',borderRadius:'10px',background:'rgba(79,70,229,0.08)',border:'1px solid rgba(79,70,229,0.2)',marginBottom:'20px'}}>
          <Lock size={13} color="#818cf8"/>
          <p style={{fontSize:'0.78rem',color:'#818cf8'}}>
            Field <strong>Diagnosa</strong> & <strong>Resep Obat</strong> akan otomatis dienkripsi dengan <strong>ChaCha20</strong>
          </p>
        </div>

        {error && (
          <div style={{display:'flex',gap:'8px',alignItems:'center',padding:'10px 14px',borderRadius:'10px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',marginBottom:'16px',color:'#f87171',fontSize:'0.83rem'}}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{display:'grid',gap:'16px'}}>
            <div>
              <label className="form-label">Pasien</label>
              <select id="rm-pasien" className="form-input"
                value={form.pasien_id} onChange={e=>setForm(p=>({...p,pasien_id:e.target.value}))} required>
                <option value="">-- Pilih Pasien --</option>
                {pasiens.map(p => <option key={p.id} value={p.id}>{p.nama_pasien}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Dokter Pemeriksa</label>
              <select id="rm-dokter" className="form-input"
                value={form.dokter_id} onChange={e=>setForm(p=>({...p,dokter_id:e.target.value}))} required>
                <option value="">-- Pilih Dokter --</option>
                {dokters.map(d => <option key={d.id} value={d.id}>{d.nama_dokter} — {d.spesialis}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">
                <Calendar size={10} style={{display:'inline',marginRight:'5px'}}/>
                Tanggal Kunjungan
              </label>
              <input id="rm-tanggal" className="form-input" type="date"
                value={form.tgl_kunjungan} onChange={e=>setForm(p=>({...p,tgl_kunjungan:e.target.value}))} required/>
            </div>
            <div>
              <label className="form-label" style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                <Lock size={10} color="#818cf8"/>
                Diagnosa — <span style={{color:'#818cf8'}}>TERENKRIPSI</span>
              </label>
              <RichTextEditor
                value={form.diagnosa}
                onChange={(content) => setForm(p => ({...p, diagnosa: content}))}
                placeholder="Tuliskan diagnosa medis pasien..."
                minHeight={200}
              />
              {/* Hidden input untuk validasi required */}
              <input type="text" required style={{opacity:0,height:0,width:0,position:'absolute'}}
                value={form.diagnosa} onChange={()=>{}}
                tabIndex={-1} aria-hidden="true"
              />
            </div>
            <div>
              <label className="form-label" style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                <Lock size={10} color="#818cf8"/>
                Resep Obat — <span style={{color:'#818cf8'}}>TERENKRIPSI</span>
              </label>
              <RichTextEditor
                value={form.resep_obat}
                onChange={(content) => setForm(p => ({...p, resep_obat: content}))}
                placeholder="Daftar obat yang diresepkan (nama, dosis, aturan pakai)..."
                minHeight={160}
              />
              <input type="text" required style={{opacity:0,height:0,width:0,position:'absolute'}}
                value={form.resep_obat} onChange={()=>{}}
                tabIndex={-1} aria-hidden="true"
              />
            </div>
          </div>

          <div style={{display:'flex',gap:'12px',marginTop:'24px',justifyContent:'flex-end'}}>
            <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
            <button id="btn-submit-rm" type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width:'14px',height:'14px',borderWidth:'2px'}}/> : <Lock size={14}/>}
              {loading ? 'Mengenkripsi & Menyimpan...' : 'Simpan & Enkripsi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RekamMedisPage() {
  const [rms, setRms] = useState([]);
  const [pasiens, setPasiens] = useState([]);
  const [dokters, setDokters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [visibleDiag, setVisibleDiag] = useState(new Set());
  const [visibleResep, setVisibleResep] = useState(new Set());

  const showToast = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 5000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [rmRes, pRes, dRes] = await Promise.all([
        getRekamMedis(), getPasiens(), getDokters()
      ]);
      setRms(Array.isArray(rmRes.data?.data) ? rmRes.data.data : []);
      setPasiens(Array.isArray(pRes.data?.data) ? pRes.data.data : []);
      setDokters(Array.isArray(dRes.data?.data) ? dRes.data.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memuat data.';
      setFetchError(msg);
      // Jangan biarkan state undefined — tetap array kosong
      setRms([]);
      setPasiens([]);
      setDokters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus rekam medis ini?')) return;
    try {
      await deleteRekamMedis(id);
      showToast('Rekam medis berhasil dihapus.');
      fetchAll();
    } catch {
      showToast('Gagal menghapus rekam medis.', 'error');
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
    doc.text('LAPORAN REKAM MEDIS', pageW / 2, 12, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Sistem Informasi Klinik — Diagnosa & Resep Terdekripsi (ChaCha20)', pageW / 2, 19, { align: 'center' });
    doc.text(`Dicetak: ${tglCetak}, ${jamCetak}`, pageW / 2, 25, { align: 'center' });

    // === TABEL ===
    const tableRows = rms.map((rm, i) => [
      i + 1,
      new Date(rm.tgl_kunjungan).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      rm.nama_pasien || '-',
      `${rm.nama_dokter || '-'}\n${rm.spesialis || ''}`,
      stripHtml(rm.diagnosa) || '[GAGAL DEKRIPSI]',
      stripHtml(rm.resep_obat) || '[GAGAL DEKRIPSI]',
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['No', 'Tanggal', 'Pasien', 'Dokter / Spesialis', 'Diagnosa (Terdekripsi)', 'Resep Obat (Terdekripsi)']],
      body: tableRows,
      styles: {
        fontSize: 8,
        cellPadding: 4,
        halign: 'left',
        valign: 'top',
        textColor: [30, 27, 75],
        lineColor: [199, 210, 254],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 32 },
        2: { cellWidth: 40 },
        3: { cellWidth: 42 },
        4: { cellWidth: 60, fontStyle: 'bold', textColor: [79, 70, 229] },
        5: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
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
    doc.text(`Total Rekam Medis: ${rms.length} data`, 14, finalY);
    doc.text('* Diagnosa & Resep Obat pada dokumen ini adalah data terdekrip dari ChaCha20 — DOKUMEN RAHASIA MEDIS', 14, finalY + 5);

    doc.save(`laporan_rekammedis_dekripsi_${now.toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      {showModal && (
        <AddRekamMedisModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            setShowModal(false);
            showToast(msg);
            fetchAll();
          }}
          pasiens={pasiens}
          dokters={dokters}
        />
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'1.5rem',fontWeight:'800',marginBottom:'4px'}}>
            Modul <span className="gradient-text">Rekam Medis</span>
          </h1>
          <p style={{color:'#8892aa',fontSize:'0.82rem'}}>
            Diagnosa tersimpan sebagai ciphertext ChaCha20 di database
          </p>
        </div>
        <div style={{display:'flex', gap:'12px'}}>
          <button className="btn-secondary" onClick={exportPDF} style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <Download size={16}/> Export PDF
          </button>
          <button id="btn-tambah-rm" className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16}/> Tambah Rekam Medis
          </button>
        </div>
      </div>

      {fetchError && !loading && (
        <div style={{display:'flex',gap:'8px',alignItems:'center',padding:'12px 16px',borderRadius:'10px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',marginBottom:'16px',color:'#f87171',fontSize:'0.83rem'}}>
          <AlertCircle size={14}/> {fetchError}
        </div>
      )}

      <div className="glass-card" style={{overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #2a2d3e',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <FileText size={16} color="#8892aa"/>
          <span style={{fontWeight:'600',fontSize:'0.875rem'}}>Daftar Rekam Medis</span>
          <span className="badge badge-primary" style={{marginLeft:'auto'}}>{rms.length} Data</span>
          <span className="enc-badge"><Lock size={9}/> Diagnosa Terenkripsi</span>
        </div>

        {loading ? (
          <div style={{padding:'60px',display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',color:'#8892aa'}}>
            <div className="spinner"/><span>Memuat & mendekripsi diagnosa...</span>
          </div>
        ) : rms.length === 0 ? (
          <div style={{padding:'60px',textAlign:'center',color:'#8892aa'}}>
            <FileText size={40} style={{margin:'0 auto 12px',opacity:0.3}}/>
            <p>Belum ada rekam medis. Klik "Tambah Rekam Medis" untuk menambahkan.</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tanggal</th>
                  <th>Pasien</th>
                  <th>Dokter</th>
                  <th>
                    <span style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <Lock size={10}/> Diagnosa <span className="enc-badge" style={{marginLeft:'4px'}}>Dekripsi</span>
                    </span>
                  </th>
                  <th>
                    <span style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <Lock size={10}/> Resep Obat <span className="enc-badge" style={{marginLeft:'4px'}}>Dekripsi</span>
                    </span>
                  </th>
                  <th style={{textAlign:'center'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rms.map((rm, i) => (
                  <tr key={rm.id}>
                    <td style={{color:'#8892aa',fontWeight:'600'}}>{i+1}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <Calendar size={13} color="#8892aa"/>
                        <span style={{fontFamily:'monospace',fontSize:'0.83rem'}}>
                          {new Date(rm.tgl_kunjungan).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
                        </span>
                      </div>
                    </td>
                    <td style={{fontWeight:'600'}}>{rm.nama_pasien}</td>
                    <td>
                      <div>
                        <div style={{fontWeight:'500',fontSize:'0.85rem'}}>{rm.nama_dokter}</div>
                        <div><span className="badge badge-cyan" style={{marginTop:'3px'}}>{rm.spesialis}</span></div>
                      </div>
                    </td>
                    <td style={{width:'220px', minWidth:'180px'}}>
                      <div style={{
                        borderRadius:'10px', overflow:'hidden',
                        border: visibleDiag.has(rm.id)
                          ? '1px solid rgba(79,70,229,0.35)'
                          : '1px solid rgba(255,255,255,0.07)',
                        background: visibleDiag.has(rm.id)
                          ? 'rgba(79,70,229,0.1)'
                          : 'rgba(255,255,255,0.03)',
                      }}>
                        {/* Header bar dengan tombol toggle */}
                        <div style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'5px 10px', borderBottom: visibleDiag.has(rm.id)
                            ? '1px solid rgba(79,70,229,0.25)' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <span style={{fontSize:'0.7rem', color: visibleDiag.has(rm.id) ? '#818cf8' : '#4b5563', fontWeight:'600', letterSpacing:'0.04em'}}>
                            {visibleDiag.has(rm.id) ? '🔓 TERDEKRIPSI' : '🔒 TERENKRIPSI'}
                          </span>
                          <button
                            onClick={() => setVisibleDiag(prev => {
                              const next = new Set(prev);
                              if (next.has(rm.id)) next.delete(rm.id); else next.add(rm.id);
                              return next;
                            })}
                            style={{
                              display:'flex', alignItems:'center', gap:'4px',
                              background: visibleDiag.has(rm.id) ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.06)',
                              border:'none', borderRadius:'6px', cursor:'pointer',
                              color: visibleDiag.has(rm.id) ? '#818cf8' : '#6b7280',
                              padding:'3px 7px', fontSize:'0.7rem', fontWeight:'600',
                            }}
                            title={visibleDiag.has(rm.id) ? 'Sembunyikan' : 'Tampilkan Dekripsi'}
                          >
                            {visibleDiag.has(rm.id) ? <><EyeOff size={11}/> Sembunyikan</> : <><Eye size={11}/> Lihat</>}
                          </button>
                        </div>
                        {/* Konten */}
                        <div style={{padding:'8px 10px'}}>
                          {visibleDiag.has(rm.id) ? (
                            <div
                              style={{fontSize:'0.81rem', color:'#e2e8f0', lineHeight:1.6, maxHeight:'130px', overflowY:'auto', wordBreak:'break-word'}}
                              dangerouslySetInnerHTML={{ __html: rm.diagnosa || '<em style="color:#6b7280">—</em>' }}
                            />
                          ) : (
                            <div style={{
                              fontSize:'0.72rem', fontFamily:'monospace', color:'#374151',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              maxWidth:'180px', userSelect:'none', filter:'blur(2.5px)',
                              letterSpacing:'1px',
                            }} title="Klik 'Lihat' untuk mendekripsi">
                              {rm.diagnosa_cipher || '••••••••••••••••'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{width:'220px', minWidth:'180px'}}>
                      <div style={{
                        borderRadius:'10px', overflow:'hidden',
                        border: visibleResep.has(rm.id)
                          ? '1px solid rgba(16,185,129,0.35)'
                          : '1px solid rgba(255,255,255,0.07)',
                        background: visibleResep.has(rm.id)
                          ? 'rgba(16,185,129,0.07)'
                          : 'rgba(255,255,255,0.03)',
                      }}>
                        {/* Header bar dengan tombol toggle */}
                        <div style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'5px 10px', borderBottom: visibleResep.has(rm.id)
                            ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <span style={{fontSize:'0.7rem', color: visibleResep.has(rm.id) ? '#34d399' : '#4b5563', fontWeight:'600', letterSpacing:'0.04em'}}>
                            {visibleResep.has(rm.id) ? '🔓 TERDEKRIPSI' : '🔒 TERENKRIPSI'}
                          </span>
                          <button
                            onClick={() => setVisibleResep(prev => {
                              const next = new Set(prev);
                              if (next.has(rm.id)) next.delete(rm.id); else next.add(rm.id);
                              return next;
                            })}
                            style={{
                              display:'flex', alignItems:'center', gap:'4px',
                              background: visibleResep.has(rm.id) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                              border:'none', borderRadius:'6px', cursor:'pointer',
                              color: visibleResep.has(rm.id) ? '#34d399' : '#6b7280',
                              padding:'3px 7px', fontSize:'0.7rem', fontWeight:'600',
                            }}
                            title={visibleResep.has(rm.id) ? 'Sembunyikan' : 'Tampilkan Dekripsi'}
                          >
                            {visibleResep.has(rm.id) ? <><EyeOff size={11}/> Sembunyikan</> : <><Eye size={11}/> Lihat</>}
                          </button>
                        </div>
                        {/* Konten */}
                        <div style={{padding:'8px 10px'}}>
                          {visibleResep.has(rm.id) ? (
                            <div
                              style={{fontSize:'0.81rem', color:'#e2e8f0', lineHeight:1.6, maxHeight:'130px', overflowY:'auto', wordBreak:'break-word'}}
                              dangerouslySetInnerHTML={{ __html: rm.resep_obat || '<em style="color:#6b7280">—</em>' }}
                            />
                          ) : (
                            <div style={{
                              fontSize:'0.72rem', fontFamily:'monospace', color:'#374151',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              maxWidth:'180px', userSelect:'none', filter:'blur(2.5px)',
                              letterSpacing:'1px',
                            }} title="Klik Lihat untuk mendekripsi">
                              {rm.resep_obat_cipher || '••••••••••••••••'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <button className="btn-danger" onClick={() => handleDelete(rm.id)}>
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
