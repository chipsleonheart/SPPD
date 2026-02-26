import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-qr-code';

export default function PembuatanSPD() {
    const { authFetch } = useAuth();
    const [stList, setStList] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [sppdList, setSppdList] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
    const [editingSpdId, setEditingSpdId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [shouldPrint, setShouldPrint] = useState(false);

    const [formData, setFormData] = useState({
        surat_tugas_id: '', pegawai_id: '', no_spd: '', no_st: '', pejabat_pembuat_komitmen: 'Siti Aminah, S.E.', nama_pegawai: '', tingkat_biaya: 'Tingkat B', maksud_perjalanan: 'Monitoring Pelaksanaan Anggaran', alat_angkut: 'Pesawat Udara', tempat_berangkat: 'Jakarta', tempat_tujuan: 'Surabaya', lama_perjalanan: '3 (Tiga) Hari', tanggal_berangkat: new Date().toISOString().split('T')[0], tanggal_kembali: new Date().toISOString().split('T')[0], instansi: 'Kementerian X', mata_anggaran: '524111 (Belanja Perjalanan Dinas Biasa)'
    });

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [resST, resPeg, resSPPD] = await Promise.all([
                    authFetch('/api/surat-tugas'),
                    authFetch('/api/pegawai'),
                    authFetch('/api/sppd')
                ]);
                const st = await resST.json();
                const peg = await resPeg.json();
                const sppdData = await resSPPD.json();

                setStList(st.filter(s => s.status_persetujuan === 'DITERBITKAN'));
                setPegawaiList(peg);
                setSppdList(sppdData);
            } catch (err) { console.error('Gagal fetch data:', err); }
        };
        loadMasterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (shouldPrint && viewMode === 'form') {
            setTimeout(() => {
                window.print();
                setShouldPrint(false);
            }, 300);
        }
    }, [shouldPrint, viewMode, formData]);

    const ppkUser = pegawaiList.find(p => p.role === 'PPK') || { nama_lengkap: formData.pejabat_pembuat_komitmen, nip: '-' };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const getAssignedPegawai = (st) => {
        if (st.pegawai && st.pegawai.length > 0) {
            return st.pegawai.map(p => p.pegawai);
        }
        // Fallback for older data or if include fails
        if (!st.nota_dinas?.pegawai_ditugaskan) return [];
        let p_names = st.nota_dinas.pegawai_ditugaskan.split(/[|,]/).map(n => n.trim()).filter(Boolean);
        return p_names.map(name => {
            return pegawaiList.find(p => p.nama_lengkap.toLowerCase().includes(name.toLowerCase())) || { id: `unknown-${name}`, nama_lengkap: name, nip: '-' };
        });
    };

    const renderDigitalSignature = (name, nip) => (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', maxWidth: '350px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                <QRCode value={window.location.origin} size={60} />
            </div>
            <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                Telah ditandatangani secara digital oleh:<br />
                <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{name}</span>
                NIP. {nip}
            </div>
        </div>
    );

    const renderDigitalSignatureLampiran = (name, nip) => (
        <div style={{ marginTop: '0.5rem' }}>
            <QRCode value={window.location.origin} size={50} style={{ marginBottom: '0.25rem' }} />
            <div style={{ lineHeight: 1.2 }}>
                <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{name}</span><br />
                NIP. {nip}
            </div>
        </div>
    );

    const handleBuatSpd = (st, peg) => {
        const nextNo = sppdList.length + 1;
        setFormData(prev => ({
            ...prev,
            surat_tugas_id: st.id,
            pegawai_id: peg.id,
            no_spd: `SPD/${String(nextNo).padStart(3, '0')}/I/2026`,
            no_st: st.nomor_st,
            nama_pegawai: peg.nama_lengkap,
            pangkat_golongan: peg.pangkat_golongan || '-',
            jabatan: peg.jabatan || '-',
            maksud_perjalanan: st.menimbang || st.nota_dinas?.perihal || 'Perjalanan Dinas',
            tempat_tujuan: st.nota_dinas?.tujuan || 'Surabaya'
        }));
        setEditingSpdId(null);
        setViewMode('form');
    };

    const handleEditSpd = (spd, st, peg) => {
        setFormData(prev => ({
            ...prev,
            surat_tugas_id: spd.surat_tugas_id,
            pegawai_id: spd.pegawai_id,
            no_spd: spd.nomor_spd,
            no_st: st.nomor_st,
            nama_pegawai: peg.nama_lengkap,
            tingkat_biaya: spd.tingkat_biaya || 'Tingkat B',
            maksud_perjalanan: st.menimbang || st.nota_dinas?.perihal || 'Perjalanan Dinas',
            alat_angkut: spd.alat_angkutan || 'Pesawat Udara',
            tempat_berangkat: spd.tempat_berangkat || 'Jakarta',
            tempat_tujuan: spd.tempat_tujuan || 'Surabaya',
            tanggal_berangkat: new Date(spd.tanggal_berangkat).toISOString().split('T')[0],
            tanggal_kembali: new Date(spd.tanggal_kembali).toISOString().split('T')[0],
            instansi: spd.instansi_pembebanan || 'Kementerian X',
            mata_anggaran: spd.mata_anggaran || '524111',
            pangkat_golongan: peg.pangkat_golongan || '-',
            jabatan: peg.jabatan || '-'
        }));
        setEditingSpdId(spd.id);
        setViewMode('form');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.surat_tugas_id || !formData.pegawai_id) {
            alert('Pilih Surat Tugas dan Pegawai terlebih dahulu!');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                surat_tugas_id: formData.surat_tugas_id,
                pegawai_id: formData.pegawai_id,
                nomor_spd: formData.no_spd,
                tingkat_biaya: formData.tingkat_biaya,
                alat_angkutan: formData.alat_angkut,
                tempat_berangkat: formData.tempat_berangkat,
                tempat_tujuan: formData.tempat_tujuan,
                tanggal_berangkat: formData.tanggal_berangkat,
                tanggal_kembali: formData.tanggal_kembali,
                instansi_pembebanan: formData.instansi,
                mata_anggaran: formData.mata_anggaran
            };

            let response;
            if (editingSpdId) {
                response = await authFetch(`/api/sppd/${editingSpdId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await authFetch('/api/sppd', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) throw new Error('Gagal menyimpan SPD');

            await response.json();

            // Reload SPPD to secure relations
            const resSPPD = await authFetch('/api/sppd');
            const sppdData = await resSPPD.json();
            setSppdList(sppdData);

            alert('Draft SPD berhasil disimpan!');
            setViewMode('list');
        } catch (err) {
            console.error('Save failed', err);
            alert('Terjadi kesalahan saat menyimpan SPD');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="spd-page">
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{viewMode === 'list' ? 'Kelola Surat Perjalanan Dinas' : (editingSpdId ? 'Edit Draft SPD' : 'Buat Draft SPD')}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{viewMode === 'list' ? 'Daftar Surat Tugas dan kelengkapan SPD untuk setiap pegawai yang ditugaskan.' : 'Lengkapi detail form di bawah ini lalu cetak dokumen resmi SPD.'}</p>
                </div>
                {viewMode === 'form' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => setViewMode('list')} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>Kembali</button>
                        <button onClick={handleSubmit} disabled={isSaving} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', opacity: isSaving ? 0.7 : 1 }}>
                            <span style={{ marginRight: '0.5rem' }}>🖨️</span> {isSaving ? 'Menyimpan...' : 'Simpan & Cetak SPD'}
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? (
                <div className="card no-print">
                    <div className="card-header">
                        <h2 className="card-title">Daftar Nota Dinas & Surat Tugas</h2>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', width: '20%' }}>Nota Dinas</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', width: '20%' }}>Surat Tugas</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', width: '60%' }}>Pegawai & Status SPD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stList.length === 0 ? (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada Surat Tugas yang tersedia.</td></tr>
                                    ) : (() => {
                                        const groupedByND = {};
                                        stList.forEach(st => {
                                            const ndId = st.nota_dinas_id;
                                            if (!groupedByND[ndId]) groupedByND[ndId] = { nd: st.nota_dinas, sts: [] };
                                            groupedByND[ndId].sts.push(st);
                                        });

                                        return Object.values(groupedByND).map(({ nd, sts }) => (
                                            sts.map((st, stIdx) => {
                                                const assigned = getAssignedPegawai(st);
                                                return (
                                                    <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                                                        {stIdx === 0 && (
                                                            <td rowSpan={sts.length} style={{ padding: '1rem 1.5rem', borderRight: '1px solid var(--border-color)' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{nd?.nomor_nd}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{nd?.perihal}</div>
                                                            </td>
                                                        )}
                                                        <td style={{ padding: '1rem 1.5rem', borderRight: '1px solid var(--border-color)' }}>
                                                            <div style={{ fontWeight: 500, color: 'var(--primary-color)', fontSize: '0.875rem' }}>{st.nomor_st}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(st.tanggal_st).toLocaleDateString('id-ID')}</div>
                                                        </td>
                                                        <td style={{ padding: '0' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                {assigned.map((peg, idx) => {
                                                                    const existingSpd = sppdList.find(s => s.surat_tugas_id === st.id && s.pegawai_id === peg.id);
                                                                    return (
                                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: idx < assigned.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{peg.nama_lengkap}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIP: {peg.nip}</div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                                <div style={{ fontSize: '0.8rem' }}>
                                                                                    {existingSpd ? (
                                                                                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--success-color)', color: 'white', fontWeight: 500 }}>Terbit</span>
                                                                                    ) : (
                                                                                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f59e0b', color: 'white', fontWeight: 500 }}>Belum Dibuat</span>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    {existingSpd ? (
                                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                            <button onClick={() => { handleEditSpd(existingSpd, st, peg); setShouldPrint(true); }} className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>🖨️ Cetak</button>
                                                                                            <button onClick={() => handleEditSpd(existingSpd, st, peg)} className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️ Edit</button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button onClick={() => handleBuatSpd(st, peg)} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Buat SPD</button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="card no-print">
                        <div className="card-header">
                            <h2 className="card-title">Form Input Detail SPD</h2>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status Surat Tugas</label>
                                        <div style={{ fontWeight: 600 }}>{formData.no_st}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pegawai Ditugaskan</label>
                                        <div style={{ fontWeight: 600 }}>{formData.nama_pegawai}</div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nomor SPD</label>
                                    <input type="text" className="form-control" name="no_spd" value={formData.no_spd} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tingkat Biaya Perjalanan Dinas</label>
                                    <select className="form-control" name="tingkat_biaya" value={formData.tingkat_biaya} onChange={handleChange}>
                                        <option value="Tingkat A">Tingkat A</option>
                                        <option value="Tingkat B">Tingkat B</option>
                                        <option value="Tingkat C">Tingkat C</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Maksud Perjalanan Dinas</label>
                                    <input type="text" className="form-control" name="maksud_perjalanan" value={formData.maksud_perjalanan} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Alat Angkutan yang Digunakan</label>
                                    <input type="text" className="form-control" name="alat_angkut" value={formData.alat_angkut} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tempat Berangkat</label>
                                    <input type="text" className="form-control" name="tempat_berangkat" value={formData.tempat_berangkat} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tempat Tujuan</label>
                                    <input type="text" className="form-control" name="tempat_tujuan" value={formData.tempat_tujuan} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Lama Perjalanan Dinas</label>
                                    <input type="text" className="form-control" name="lama_perjalanan" value={formData.lama_perjalanan} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Berangkat</label>
                                    <input type="date" className="form-control" name="tanggal_berangkat" value={formData.tanggal_berangkat} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Harus Kembali</label>
                                    <input type="date" className="form-control" name="tanggal_kembali" value={formData.tanggal_kembali} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Instansi Pembebanan Anggaran</label>
                                    <input type="text" className="form-control" name="instansi" value={formData.instansi} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mata Anggaran</label>
                                    <input type="text" className="form-control" name="mata_anggaran" value={formData.mata_anggaran} onChange={handleChange} />
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {/* --- PRINT LAYOUT SURAT PERJALANAN DINAS --- */}
            <style>
                {`
          @media print {
            .print-spd-container {
              display: block !important;
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.5;
              padding: 2cm;
              background: white;
            }
            .spd-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1rem;
            }
            .spd-table td {
              border: 1px solid black;
              padding: 0.5rem;
              vertical-align: top;
            }
          }
          .print-spd-container {
            display: none;
          }
        `}
            </style>

            <div className="print-spd-container">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                    <table style={{ border: 'none', width: '300px' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '100px' }}>Lembar Ke</td>
                                <td>: </td>
                            </tr>
                            <tr>
                                <td>Kode No.</td>
                                <td>: </td>
                            </tr>
                            <tr>
                                <td>Nomor</td>
                                <td>: {formData.no_spd}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2rem' }}>
                    SURAT PERJALANAN DINAS (SPD)
                </h2>

                <table className="spd-table">
                    <tbody>
                        <tr>
                            <td style={{ width: '5%', textAlign: 'center' }}>1</td>
                            <td style={{ width: '45%' }}>Pejabat Pembuat Komitmen</td>
                            <td style={{ width: '50%' }}>{formData.pejabat_pembuat_komitmen}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>2</td>
                            <td>Nama/NIP Pegawai yang melaksanakan perjalanan dinas</td>
                            <td>{formData.nama_pegawai}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>3</td>
                            <td>
                                a. Pangkat dan Golongan ruang gaji menurut PP No. 6 Tahun 1997<br />
                                b. Jabatan/Instansi<br />
                                c. Tingkat Biaya Perjalanan Dinas
                            </td>
                            <td>
                                a. {formData.pangkat_golongan}<br />
                                b. {formData.jabatan} / {formData.instansi}<br />
                                c. {formData.tingkat_biaya}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>4</td>
                            <td>Maksud Perjalanan Dinas</td>
                            <td>{formData.maksud_perjalanan}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>5</td>
                            <td>Alat angkutan yang dipergunakan</td>
                            <td>{formData.alat_angkut}</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>6</td>
                            <td>
                                a. Tempat Berangkat<br />
                                b. Tempat Tujuan
                            </td>
                            <td>
                                a. {formData.tempat_berangkat}<br />
                                b. {formData.tempat_tujuan}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>7</td>
                            <td>
                                a. Lamanya Perjalanan Dinas<br />
                                b. Tanggal Berangkat<br />
                                c. Tanggal Harus Kembali/Tiba di tempat baru *)
                            </td>
                            <td>
                                a. {formData.lama_perjalanan}<br />
                                b. {formData.tanggal_berangkat}<br />
                                c. {formData.tanggal_kembali}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>8</td>
                            <td>
                                Pembebanan Anggaran<br />
                                a. Instansi<br />
                                b. Akun
                            </td>
                            <td>
                                <br />
                                a. {formData.instansi}<br />
                                b. {formData.mata_anggaran}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'center' }}>9</td>
                            <td>Keterangan lain-lain</td>
                            <td>Berdasarkan Surat Tugas No: {formData.no_st}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px', textAlign: 'left' }}>
                        <p>Dikeluarkan di: {formData.tempat_berangkat}</p>
                        <p>Tanggal: {new Date().toISOString().split('T')[0]}</p>
                        <p style={{ marginTop: '1rem' }}>Pejabat Pembuat Komitmen</p>
                        {renderDigitalSignature(ppkUser.nama_lengkap, ppkUser.nip)}
                    </div>
                </div>
            </div>

            {/* HALAMAN BELAKANG (LAMPIRAN SPD) */}
            <div className="print-spd-container" style={{ pageBreakBefore: 'always', fontSize: '10pt' }}>
                <table className="spd-table" style={{ width: '100%', marginBottom: '0', border: '1px solid black' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', borderRight: '1px solid black', padding: '0.5rem' }}>
                                <br />
                                <br />
                                <br />
                                <br />
                                <br />
                            </td>
                            <td style={{ width: '50%', padding: '0.5rem' }}>
                                <table style={{ width: '100%', border: 'none' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '10px', verticalAlign: 'top', border: 'none' }}>I.</td>
                                            <td style={{ width: '100px', verticalAlign: 'top', border: 'none' }}>Berangkat dari</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tempat_berangkat}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>(Tempat Kedudukan)</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}></td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>Ke</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tempat_tujuan}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>Pada Tanggal</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tanggal_berangkat}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td colSpan="2" style={{ paddingTop: '1rem', border: 'none' }}>Pejabat Pembuat Komitmen</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td colSpan="2" style={{ border: 'none' }}>
                                                {renderDigitalSignatureLampiran(ppkUser.nama_lengkap, ppkUser.nip)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>

                        {/* SECTION II */}
                        <tr>
                            <td style={{ padding: '0.5rem', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                <table style={{ width: '100%', border: 'none' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '10px', verticalAlign: 'top', border: 'none' }}>II.</td>
                                            <td style={{ width: '80px', verticalAlign: 'top', border: 'none' }}>Tiba di</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tempat_tujuan}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>Pada Tanggal</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tanggal_berangkat}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td colSpan="2" style={{ paddingTop: '0.5rem', border: 'none' }}>Kepala ...................................................</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <br /><br />
                                <p style={{ marginLeft: '1rem' }}>(...................................................)</p>
                                <p style={{ marginLeft: '1rem' }}>NIP ...................................................</p>
                            </td>
                            <td style={{ padding: '0.5rem', borderTop: '1px solid black' }}>
                                <table style={{ width: '100%', border: 'none' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '80px', verticalAlign: 'top', border: 'none' }}>Berangkat dari</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tempat_tujuan}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>Ke</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tempat_berangkat}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>Pada Tanggal</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tanggal_kembali}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="2" style={{ paddingTop: '0.5rem', border: 'none' }}>Kepala ...................................................</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <br /><br />
                                <p>(...................................................)</p>
                                <p>NIP ...................................................</p>
                            </td>
                        </tr>


                        {/* SECTION VI - ARRIVAL BACK AT BASE */}
                        <tr>
                            <td style={{ padding: '0.5rem', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                <table style={{ width: '100%', border: 'none' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '10px', verticalAlign: 'top', border: 'none' }}>VI.</td>
                                            <td style={{ width: '80px', verticalAlign: 'top', border: 'none' }}>Tiba di</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tempat_berangkat}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>(Tempat Kedudukan)</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}></td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>Pada Tanggal</td>
                                            <td style={{ verticalAlign: 'top', border: 'none' }}>: {formData.tanggal_kembali}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td colSpan="2" style={{ paddingTop: '1rem', border: 'none' }}>Pejabat Pembuat Komitmen</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: 'none' }}></td>
                                            <td colSpan="2" style={{ border: 'none' }}>
                                                {renderDigitalSignatureLampiran(ppkUser.nama_lengkap, ppkUser.nip)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td style={{ padding: '0.5rem', borderTop: '1px solid black' }}>
                                <p style={{ textAlign: 'justify' }}>Telah diperiksa dengan keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.</p>
                                <p style={{ marginTop: '0.5rem' }}>Pejabat Pembuat Komitmen</p>
                                {renderDigitalSignatureLampiran(ppkUser.nama_lengkap, ppkUser.nip)}
                            </td>
                        </tr>

                        {/* SECTION VII - CATATAN */}
                        <tr>
                            <td style={{ padding: '0.5rem', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                <p>VII. Catatan Lain-lain</p>
                            </td>
                            <td style={{ padding: '0.5rem', borderTop: '1px solid black' }}>
                            </td>
                        </tr>

                        {/* SECTION VIII - PERHATIAN */}
                        <tr>
                            <td colSpan="2" style={{ padding: '0.5rem 1rem', borderTop: '1px solid black' }}>
                                <p>VIII. <strong>PERHATIAN:</strong></p>
                                <p style={{ fontSize: '9pt', textAlign: 'justify' }}>
                                    PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.
                                </p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
