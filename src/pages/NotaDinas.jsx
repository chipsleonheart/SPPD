import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-qr-code';

export default function NotaDinas() {
    const { user, authFetch } = useAuth();
    const [formData, setFormData] = useState({
        nomor: 'ND/01/I/2026',
        tujuan: '',
        tanggal: new Date().toISOString().split('T')[0],
        perihal: '',
        dasar: '',
        maksud: '',
        pegawaiList: [''],
    });

    const [editId, setEditId] = useState(null);
    const [submittedForms, setSubmittedForms] = useState([]);
    const [pegawaiOptions, setPegawaiOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedND, setSelectedND] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [ppkUser, setPpkUser] = useState(null);

    const fetchData = async () => {
        try {
            const [resND, resPeg] = await Promise.all([
                authFetch('http://localhost:3001/api/nota-dinas'),
                authFetch('http://localhost:3001/api/pegawai')
            ]);
            const dataND = await resND.json();
            const dataPeg = await resPeg.json();
            setSubmittedForms(dataND);
            setPegawaiOptions(dataPeg);

            // Cari user dengan role PPK untuk tanda tangan
            const ppk = dataPeg.find(p => p.role === 'PPK' || p.jabatan?.toLowerCase().includes('ppk'));
            setPpkUser(ppk);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePegawaiChange = (index, value) => {
        const newList = [...formData.pegawaiList];
        newList[index] = value;
        setFormData(prev => ({ ...prev, pegawaiList: newList }));
    };

    const addPegawai = () => {
        setFormData(prev => ({ ...prev, pegawaiList: [...prev.pegawaiList, ''] }));
    };

    const removePegawai = (index) => {
        const newList = [...formData.pegawaiList];
        newList.splice(index, 1);
        setFormData(prev => ({ ...prev, pegawaiList: newList }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                nomor_nd: formData.nomor,
                tanggal_nd: formData.tanggal,
                tujuan: formData.tujuan,
                perihal: formData.perihal,
                dasar: formData.dasar,
                maksud: formData.maksud,
                pegawai_ditugaskan: formData.pegawaiList.filter(p => p.trim() !== '').join(' | '),
                pengusul_id: user?.id
            };

            const endpoint = editId ? `http://localhost:3001/api/nota-dinas/${editId}` : 'http://localhost:3001/api/nota-dinas';
            const method = editId ? 'PUT' : 'POST';

            await authFetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            alert(editId ? 'Nota Dinas berhasil diperbarui!' : 'Nota Dinas berhasil diajukan untuk persetujuan PPK!');
            fetchData();
            setEditId(null);
            setFormData({ ...formData, nomor: `ND/${Math.floor(Math.random() * 100)}/I/2026`, perihal: '', dasar: '', maksud: '', tujuan: '', pegawaiList: [''] });
        } catch (error) {
            console.error(error);
            alert('Gagal mengirim Nota Dinas');
        }
    };

    const handleEdit = (form) => {
        setEditId(form.id);
        setFormData({
            nomor: form.nomor_nd,
            tujuan: form.tujuan || '',
            tanggal: form.tanggal_nd.split('T')[0],
            perihal: form.perihal || '',
            dasar: form.dasar || '',
            maksud: form.maksud || '',
            pegawaiList: form.pegawai_ditugaskan ? (form.pegawai_ditugaskan.includes('|') ? form.pegawai_ditugaskan.split(' | ') : form.pegawai_ditugaskan.split(', ')) : ['']
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCetakND = (nd) => {
        setSelectedND(nd);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    return (
        <div className="nota-dinas-page">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Pengajuan Nota Dinas</h1>
                <p style={{ color: 'var(--text-muted)' }}>Buat dan ajukan Nota Dinas untuk persetujuan perjalanan dinas.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Form Pembuatan */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">{editId ? 'Edit Nota Dinas' : 'Form Nota Dinas'}</h2>
                        {editId && (
                            <button onClick={() => {
                                setEditId(null);
                                setFormData({ nomor: '', tujuan: '', tanggal: '', perihal: '', dasar: '', maksud: '', pegawaiList: [''] });
                            }} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Batal Edit</button>
                        )}
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Nomor Nota Dinas</label>
                                <input type="text" className="form-control" name="nomor" value={formData.nomor} onChange={handleChange} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Tempat Tujuan</label>
                                    <input type="text" className="form-control" name="tujuan" value={formData.tujuan} onChange={handleChange} placeholder="Contoh: Jakarta / Surabaya / Hotel ABC..." required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal</label>
                                    <input type="date" className="form-control" name="tanggal" value={formData.tanggal} onChange={handleChange} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Perihal</label>
                                <input type="text" className="form-control" name="perihal" value={formData.perihal} onChange={handleChange} placeholder="Permohonan Perjalanan Dinas dalam rangka..." required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dasar Pelaksanaan (Opsional)</label>
                                <textarea className="form-control" name="dasar" value={formData.dasar} onChange={handleChange} rows="2" placeholder="Surat Undangan / DIPA..."></textarea>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Maksud & Tujuan Perjalanan</label>
                                <textarea className="form-control" name="maksud" value={formData.maksud} onChange={handleChange} rows="3" required></textarea>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Pegawai yang Ditugaskan
                                    <button type="button" onClick={addPegawai} style={{ color: 'var(--primary-color)', fontSize: '0.875rem', fontWeight: 600 }}>+ Tambah ASN</button>
                                </label>
                                {formData.pegawaiList.map((pegawai, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <select className="form-control" value={pegawai} onChange={(e) => handlePegawaiChange(index, e.target.value)} required>
                                            <option value="" disabled>--- Pilih Pegawai ---</option>
                                            {pegawaiOptions.map(p => (
                                                <option key={p.id} value={p.nama_lengkap}>{p.nip} - {p.nama_lengkap}</option>
                                            ))}
                                        </select>
                                        {formData.pegawaiList.length > 1 && (
                                            <button type="button" onClick={() => removePegawai(index)} className="btn btn-outline" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>Hapus</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => {
                                    setEditId(null);
                                    setFormData({ nomor: '', tujuan: '', tanggal: '', perihal: '', dasar: '', maksud: '', pegawaiList: [''] });
                                }} className="btn btn-outline">Batal</button>
                                <button type="submit" className="btn btn-primary">{editId ? 'Update Nota Dinas' : 'Ajukan ke PPK'}</button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Riwayat Pengajuan - Table View */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Daftar Riwayat Nota Dinas</h2>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--secondary-color)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem' }}>Tanggal</th>
                                        <th style={{ padding: '1rem' }}>Nomor Nota Dinas</th>
                                        <th style={{ padding: '1rem' }}>Perihal & Tujuan</th>
                                        <th style={{ padding: '1rem' }}>Pegawai Ditugaskan</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</td></tr>
                                    ) : submittedForms.length === 0 ? (
                                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada riwayat pengajuan.</td></tr>
                                    ) : submittedForms.map(form => (
                                        <tr key={form.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{new Date(form.tanggal_nd).toLocaleDateString('id-ID')}</td>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{form.nomor_nd}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 500 }}>{form.perihal}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Tujuan: {form.tujuan}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--primary-color)', fontSize: '0.85rem' }}>
                                                    {form.pegawai_ditugaskan ? (
                                                        form.pegawai_ditugaskan.split(form.pegawai_ditugaskan.includes('|') ? ' | ' : ', ').map((p, i) => (
                                                            <li key={i}>{p}</li>
                                                        ))
                                                    ) : <li>-</li>}
                                                </ul>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '1rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: form.status.includes('DITOLAK') ? 'var(--danger-color)' : (form.status === 'DIAJUKAN' || form.status === 'DRAFT') ? 'var(--warning-color)' : 'var(--success-color)',
                                                    color: '#fff'
                                                }}>
                                                    {form.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    {form.status === 'DIAJUKAN' && (
                                                        <button onClick={() => handleEdit(form)} className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>✏️ Edit</button>
                                                    )}
                                                    <button onClick={() => handleCetakND(form)} className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>🖨️ Cetak</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Layout */}
            <style>
                {`
                    @media print {
                        .nota-dinas-page > div:not(.print-nd-container) {
                            display: none !important;
                        }
                        .print-nd-container {
                            display: block !important;
                            font-family: 'Times New Roman', Times, serif;
                            font-size: 11pt;
                            line-height: 1.5;
                            padding: 2cm;
                            background: white;
                        }
                    }
                    .print-nd-container {
                        display: none;
                    }
                `}
            </style>

            {selectedND && (
                <div className="print-nd-container">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid black', paddingBottom: '1rem' }}>
                        <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>NOTA DINAS</h2>
                    </div>

                    <table style={{ width: '100%', marginBottom: '1.5rem', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '80px', padding: '2px 0' }}>Kepada</td>
                                <td style={{ width: '10px', padding: '2px 0' }}>:</td>
                                <td style={{ padding: '2px 0' }}>Pejabat Pembuat Komitmen</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Dari</td>
                                <td style={{ padding: '2px 0' }}>:</td>
                                <td style={{ padding: '2px 0' }}>{selectedND.pengusul?.nama_lengkap}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Tanggal</td>
                                <td style={{ padding: '2px 0' }}>:</td>
                                <td style={{ padding: '2px 0' }}>{new Date(selectedND.tanggal_nd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Nomor</td>
                                <td style={{ padding: '2px 0' }}>:</td>
                                <td style={{ padding: '2px 0' }}>{selectedND.nomor_nd}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Perihal</td>
                                <td style={{ padding: '2px 0' }}>:</td>
                                <td style={{ padding: '2px 0', fontWeight: 'bold' }}>{selectedND.perihal}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ padding: '0.5rem 0' }}>
                        <p style={{ margin: '0 0 1rem 0' }}>{selectedND.dasar ? `Mendasari ${selectedND.dasar}, d` : 'D'}engan ini kami usulkan perjalanan dinas dalam rangka {selectedND.maksud} ke {selectedND.tujuan}.</p>

                        <p style={{ margin: '0 0 0.5rem 0' }}>Adapun pegawai yang kami usulkan adalah sebagai berikut:</p>
                        <ol style={{ paddingLeft: '1.5rem' }}>
                            {selectedND.pegawai_ditugaskan?.split(selectedND.pegawai_ditugaskan.includes('|') ? ' | ' : ', ').map((peg, idx) => (
                                <li key={idx} style={{ marginBottom: '0.2rem' }}>{peg}</li>
                            ))}
                        </ol>

                        <p style={{ marginTop: '1.5rem' }}>Demikian usulan ini kami sampaikan untuk mendapatkan persetujuan. Atas perhatiannya diucapkan terima kasih.</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
                        <div style={{ width: '300px' }}>
                            <p style={{ marginBottom: '1.5rem' }}>{selectedND.tujuan.split(' / ')[0] || 'Jakarta'}, {new Date(selectedND.tanggal_nd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                    <QRCode value={window.location.origin + '/verifikasi/nd/' + selectedND.id} size={60} />
                                </div>
                                <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                                    Telah ditandatangani secara digital oleh:<br />
                                    <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{selectedND.pengusul?.nama_lengkap}</span>
                                    NIP. {selectedND.pengusul?.nip}
                                </div>
                            </div>

                            <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '0.5rem', marginBottom: 0 }}>{selectedND.pengusul?.nama_lengkap}</p>
                            <p style={{ margin: 0 }}>NIP. {selectedND.pengusul?.nip}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
