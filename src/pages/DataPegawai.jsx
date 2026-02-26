import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DataPegawai() {
    const { authFetch } = useAuth();
    const [pegawaiList, setPegawaiList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ nip: '', nama_lengkap: '', pangkat_golongan: '', jabatan: '', role: 'PEGAWAI', password: '' });

    const API_URL = 'http://localhost:3001/api/pegawai';

    const fetchPegawai = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(API_URL);
            const data = await res.json();
            setPegawaiList(data);
        } catch (error) {
            console.error('Error fetching pegawai:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPegawai();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openAddModal = () => {
        setEditId(null);
        setFormData({ nip: '', nama_lengkap: '', pangkat_golongan: '', jabatan: '', role: 'PEGAWAI', password: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (pegawai) => {
        setEditId(pegawai.id);
        setFormData({
            nip: pegawai.nip,
            nama_lengkap: pegawai.nama_lengkap,
            pangkat_golongan: pegawai.pangkat_golongan,
            jabatan: pegawai.jabatan,
            role: pegawai.role
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus pegawai ini?')) return;
        try {
            await authFetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchPegawai();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = editId ? 'PUT' : 'POST';
            const url = editId ? `${API_URL}/${editId}` : API_URL;
            const payload = { ...formData };
            // Only send password if filled in (for edit)
            if (!payload.password) delete payload.password;

            await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            setIsModalOpen(false);
            fetchPegawai();
        } catch (error) {
            console.error('Failed to submit:', error);
        }
    };

    return (
        <div className="pegawai-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Master Data Pegawai ASN</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kelola data pegawai, golongan, jabatan, dan peran persetujuan (PPK / Sekretaris).</p>
                </div>
                <button onClick={openAddModal} className="btn btn-primary">
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span> Tambah Pegawai
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>NIP</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Nama Lengkap</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pangkat / Golongan</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Jabatan</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Role Sistem</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data dari server...</td>
                                </tr>
                            ) : pegawaiList.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data pegawai. Silakan tambah data.</td>
                                </tr>
                            ) : pegawaiList.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{p.nip}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{p.nama_lengkap}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                        <span style={{ backgroundColor: 'var(--secondary-color)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {p.pangkat_golongan}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{p.jabatan}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                        {p.role === 'KPA' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--danger-color)', color: 'white' }}>Sekretaris (KPA)</span>}
                                        {p.role === 'PPK' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--warning-color)', color: '#fff' }}>PPK</span>}
                                        {p.role === 'BENDAHARA_PENGELUARAN' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#8b5cf6', color: 'white' }}>Bendahara</span>}
                                        {p.role === 'PEGAWAI' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--secondary-color)', color: 'var(--text-main)' }}>Pegawai</span>}
                                        {p.role === 'ADMIN' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--primary-color)', color: 'white' }}>Admin</span>}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => openEditModal(p)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Edit Data</button>
                                        <button onClick={() => handleDelete(p.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>Hapus</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit/Tambah Pegawai */}
            {isModalOpen && (
                <>
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50 }}></div>
                    <div className="card animate-fade-in" style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 51, width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">{editId ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">NIP</label>
                                    <input required type="text" className="form-control" value={formData.nip} onChange={e => setFormData({ ...formData, nip: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap</label>
                                    <input required type="text" className="form-control" value={formData.nama_lengkap} onChange={e => setFormData({ ...formData, nama_lengkap: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Golongan</label>
                                        <input required type="text" className="form-control" value={formData.pangkat_golongan} onChange={e => setFormData({ ...formData, pangkat_golongan: e.target.value })} placeholder="Contoh: III/b" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Role Sistem / Admin</label>
                                        <select className="form-control" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="PEGAWAI">Pegawai Biasa</option>
                                            <option value="BENDAHARA_PENGELUARAN">Bendahara Pengeluaran</option>
                                            <option value="PPK">Pejabat Pembuat Komitmen (PPK)</option>
                                            <option value="KPA">Sekretaris (KPA)</option>
                                            <option value="KETUA">Ketua</option>
                                            <option value="KOMISIONER">Komisioner</option>
                                            <option value="ADMIN">Administrator</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jabatan</label>
                                    <input required type="text" className="form-control" value={formData.jabatan} onChange={e => setFormData({ ...formData, jabatan: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{editId ? 'Password Baru (kosongkan jika tidak ganti)' : 'Password Login'}</label>
                                    <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editId ? 'Isi untuk mengganti password' : 'Default: ganti_password_123'} autoComplete="new-password" />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Batal</button>
                                    <button type="submit" className="btn btn-primary">Simpan Data</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
