import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-qr-code';

export default function LaporanPerjalanan() {
    const { authFetch, user } = useAuth();
    const [stList, setStList] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [sppdList, setSppdList] = useState([]);
    const [geotagList, setGeotagList] = useState([]);

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
    const [shouldPrint, setShouldPrint] = useState(false);

    const initialFormState = {
        no_st: '',
        tanggal_st: new Date().toISOString().split('T')[0],
        pegawai_id: '',
        nama: '',
        nip: '',
        pangkat: '',
        jabatan: '',
        maksud: '',
        tempat_tujuan: '',
        waktu_pelaksanaan: '',
        hasil_kegiatan: '1. Berhasil tiba di lokasi tujuan dan berkoordinasi secara teknis.\n2. \n3. ',
        tempat_dibuat: 'Jakarta',
        tanggal_dibuat: new Date().toISOString().split('T')[0],
        geotag: null
    };
    const [formData, setFormData] = useState(initialFormState);

    const loadData = async () => {
        try {
            const [resST, resPeg, resSPPD, resGeo] = await Promise.all([
                authFetch('http://localhost:3001/api/surat-tugas'),
                authFetch('http://localhost:3001/api/pegawai'),
                authFetch('http://localhost:3001/api/sppd'),
                authFetch('http://localhost:3001/api/geotagging')
            ]);

            const stData = await resST.json();
            const pegData = await resPeg.json();
            const sppdData = await resSPPD.json();
            const geoData = await resGeo.json();

            // Filter ST yang disetujui
            const activeST = stData.filter(st => st.status_persetujuan === 'DITERBITKAN');

            // Filter ST berdasarkan akses pegawai / komisioner
            const isLimitedRole = user?.role === 'PEGAWAI' || user?.role === 'KOMISIONER';
            const filteredST = isLimitedRole ? activeST.filter(st => {
                const userName = (user?.nama_lengkap || '').toLowerCase();
                const userNameShort = (user?.nama || '').toLowerCase();

                const isAssigned = (st.nota_dinas?.pegawai_ditugaskan || '').toLowerCase().includes(userName) || (st.nota_dinas?.pegawai_ditugaskan || '').toLowerCase().includes(userNameShort);
                const isUsul = (st.nota_dinas?.pengusul?.nama_lengkap || '').toLowerCase().includes(userName) || (st.nota_dinas?.pengusul?.nama_lengkap || '').toLowerCase().includes(userNameShort);

                // Cek relasi pivot table baru (SuratTugasPegawai)
                const isPivotAssigned = st.pegawai?.some(p => p.pegawai_id === user.id);

                return isAssigned || isUsul || isPivotAssigned;
            }) : activeST;

            setStList(filteredST);
            setPegawaiList(pegData);
            setSppdList(sppdData.filter(s => s.status === 'DITERBITKAN'));
            setGeotagList(geoData);
        } catch (err) { console.error('Gagal memuat data:', err); }
    };

    useEffect(() => {
        loadData();
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

    const getAssignedPegawaiWithSPD = (st) => {
        const relatedSpds = sppdList.filter(spd => spd.surat_tugas_id === st.id);
        const assigned = [];
        const seenIds = new Set();

        relatedSpds.forEach(spd => {
            const peg = pegawaiList.find(p => p.id === spd.pegawai_id) || { id: spd.pegawai_id, nama_lengkap: 'Unknown', nip: spd.pegawai_id };
            if (!seenIds.has(peg.id)) {
                seenIds.add(peg.id);
                const pegGeotag = geotagList.find(g => g.sppd_id === spd.id);
                assigned.push({ ...peg, matchedSpd: spd, geotag: pegGeotag });
            }
        });

        return assigned;
    };

    const handleBuatLaporan = (st, pegAndSpd) => {
        setFormData({
            ...initialFormState,
            no_st: st.nomor_st,
            tanggal_st: st.tanggal_st ? st.tanggal_st.split('T')[0] : new Date().toISOString().split('T')[0],
            pegawai_id: pegAndSpd.id,
            nama: pegAndSpd.nama_lengkap,
            nip: pegAndSpd.nip,
            pangkat: pegAndSpd.pangkat_golongan || '',
            jabatan: pegAndSpd.jabatan || '',
            maksud: st.menimbang || st.nota_dinas?.perihal || '',
            tempat_tujuan: pegAndSpd.matchedSpd.tempat_tujuan || st.nota_dinas?.tujuan || '',
            geotag: pegAndSpd.geotag || null
        });
        setViewMode('form');
        window.scrollTo(0, 0);
    };

    const handleCetakLaporan = (st, pegAndSpd) => {
        handleBuatLaporan(st, pegAndSpd);
        setShouldPrint(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    // Kelompokkan ST berdasarkan Nota Dinas
    const ndGroups = {};
    stList.forEach(st => {
        const ndId = st.nota_dinas_id || 'unknown';
        if (!ndGroups[ndId]) {
            ndGroups[ndId] = { nota_dinas: st.nota_dinas, stItems: [] };
        }
        ndGroups[ndId].stItems.push(st);
    });
    const groupList = Object.values(ndGroups);

    return (
        <div className="laporan-page">
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Laporan Perjalanan Dinas</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{viewMode === 'list' ? 'Daftar laporan perjalanan dikelompokkan berdasarkan Nota Dinas.' : 'Buat dan cetak ringkasan laporan hasil pelaksanaan dinas luar.'}</p>
                </div>
                {viewMode === 'form' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => setViewMode('list')} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>Kembali</button>
                        <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                            <span style={{ marginRight: '0.5rem' }}>🖨️</span> Cetak Laporan
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? (
                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupList.length === 0 ? (
                        <div className="card">
                            <div className="card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                Tidak ada data Laporan Perjalanan yang tersedia untuk Anda.
                            </div>
                        </div>
                    ) : groupList.map((group, gIdx) => {
                        const nd = group.nota_dinas;
                        return (
                            <div className="card" key={gIdx}>
                                {/* Header Nota Dinas */}
                                <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>
                                                📝 {nd?.nomor_nd || 'Nota Dinas'}
                                            </h2>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {nd?.perihal || '-'} — Tujuan: <strong>{nd?.tujuan || '-'}</strong>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            <div>Tanggal: {nd?.tanggal_nd ? new Date(nd.tanggal_nd).toLocaleDateString('id-ID') : '-'}</div>
                                            <div>Pegawai: <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{nd?.pegawai_ditugaskan || '-'}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabel Surat Tugas dalam Nota Dinas ini */}
                                <div className="card-body" style={{ padding: 0 }}>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                                    <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.8rem', width: '22%' }}>No. Surat Tugas</th>
                                                    <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.8rem', width: '25%' }}>Menimbang / Perihal</th>
                                                    <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.8rem', width: '53%' }}>Pegawai Pemilik SPD & Laporan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.stItems.map(st => {
                                                    const assignedWithSpd = getAssignedPegawaiWithSPD(st);
                                                    return (
                                                        <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                                                            <td style={{ padding: '0.75rem 1.5rem' }}>
                                                                <span style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{st.nomor_st}</span><br />
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(st.tanggal_st).toLocaleDateString('id-ID')}</span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}>{st.menimbang || nd?.perihal || '-'}</td>
                                                            <td style={{ padding: '0' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    {assignedWithSpd.length === 0 && (
                                                                        <div style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Belum ada SPD yang diterbitkan.</div>
                                                                    )}
                                                                    {assignedWithSpd.map((pegAndSpd, idx) => {
                                                                        const hasGeotag = !!pegAndSpd.geotag;
                                                                        return (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: idx < assignedWithSpd.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                                                <div>
                                                                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{pegAndSpd.nama_lengkap}</div>
                                                                                    <div style={{ fontSize: '0.75rem', marginTop: '0.15rem', color: 'var(--text-muted)' }}>{pegAndSpd.matchedSpd.nomor_spd}</div>
                                                                                    <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                                                                        {hasGeotag ? (
                                                                                            <span style={{ display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--success-color)', color: 'white', fontWeight: 500 }}>Lokasi Diverifikasi</span>
                                                                                        ) : (
                                                                                            <span style={{ display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--border-color)', color: 'var(--text-muted)', fontWeight: 500 }}>Belum Check-In</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                    <button onClick={() => handleCetakLaporan(st, pegAndSpd)} className="btn btn-sm" style={{ border: '1px solid var(--border-color)', backgroundColor: 'transparent' }} title="Cetak Laporan">🖨️ Cetak</button>
                                                                                    <button onClick={() => handleBuatLaporan(st, pegAndSpd)} className="btn btn-sm btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>Isi Form Laporan</button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <>
                    <div className="card no-print">
                        <div className="card-header">
                            <h2 className="card-title">Form Input Laporan</h2>
                        </div>
                        <div className="card-body">
                            <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nomor Surat Tugas</label>
                                        <div style={{ fontWeight: 600 }}>{formData.no_st}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pegawai</label>
                                        <div style={{ fontWeight: 600 }}>{formData.nama} ({formData.nip})</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Maksud Tujuan</label>
                                        <div style={{ fontWeight: 600 }}>{formData.tempat_tujuan}</div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Pangkat / Golongan</label>
                                    <input type="text" className="form-control" name="pangkat" value={formData.pangkat} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jabatan</label>
                                    <input type="text" className="form-control" name="jabatan" value={formData.jabatan} onChange={handleChange} />
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Maksud Perjalanan Dinas</label>
                                    <input type="text" className="form-control" name="maksud" value={formData.maksud} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Waktu Pelaksanaan</label>
                                    <input type="text" className="form-control" name="waktu_pelaksanaan" value={formData.waktu_pelaksanaan} onChange={handleChange} placeholder="cth: 10 Jan 2026 s.d 12 Jan 2026" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tempat Tujuan</label>
                                    <input type="text" className="form-control" name="tempat_tujuan" value={formData.tempat_tujuan} onChange={handleChange} />
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Hasil Kegiatan (Uraian)</label>
                                    <textarea className="form-control" name="hasil_kegiatan" value={formData.hasil_kegiatan} onChange={handleChange} rows="6"></textarea>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tempat Dibuat</label>
                                    <input type="text" className="form-control" name="tempat_dibuat" value={formData.tempat_dibuat} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Dibuat</label>
                                    <input type="date" className="form-control" name="tanggal_dibuat" value={formData.tanggal_dibuat} onChange={handleChange} />
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* --- PRINT LAYOUT LAPORAN --- */}
                    <div className="print-laporan-container">
                        <style>
                            {`
                                @media print {
                                    .laporan-page > div:not(.print-laporan-container) {
                                        display: none !important;
                                    }
                                    .print-laporan-container {
                                        display: block !important;
                                        font-family: 'Times New Roman', Times, serif;
                                        font-size: 11pt;
                                        line-height: 1.5;
                                        padding: 2cm;
                                        background: white;
                                    }
                                    .print-laporan-container img { max-width: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    .laporan-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
                                    .laporan-table td { padding: 0.5rem; vertical-align: top; }
                                }
                                .print-laporan-container {
                                    display: none;
                                }
                            `}
                        </style>

                        <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2rem' }}>
                            LAPORAN PERJALANAN DINAS
                        </h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p>Mendasari Surat Tugas Sekretaris Nomor {formData.no_st} tanggal {formData.tanggal_st}, dengan ini kami laporkan hasil perjalanan dinas sebagai berikut:</p>
                        </div>

                        <table className="laporan-table" style={{ border: 'none' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '5%', textAlign: 'center' }}>1.</td>
                                    <td style={{ width: '35%' }}>Nama Pegawai / NIP</td>
                                    <td style={{ width: '5%' }}>:</td>
                                    <td style={{ width: '55%' }}>{formData.nama} / {formData.nip}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>2.</td>
                                    <td>Pangkat dan Golongan</td>
                                    <td>:</td>
                                    <td>{formData.pangkat}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>3.</td>
                                    <td>Jabatan</td>
                                    <td>:</td>
                                    <td>{formData.jabatan}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>4.</td>
                                    <td>Maksud Perjalanan Dinas</td>
                                    <td>:</td>
                                    <td>{formData.maksud}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>5.</td>
                                    <td>Waktu Pelaksanaan</td>
                                    <td>:</td>
                                    <td>{formData.waktu_pelaksanaan}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>6.</td>
                                    <td>Tempat Tujuan</td>
                                    <td>:</td>
                                    <td>{formData.tempat_tujuan}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>7.</td>
                                    <td>Hasil Kegiatan</td>
                                    <td>:</td>
                                    <td>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{formData.hasil_kegiatan}</div>
                                    </td>
                                </tr>
                                {formData.geotag && (
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>8.</td>
                                        <td>Bukti Kehadiran (Geotagging)</td>
                                        <td>:</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                                    <img
                                                        src={`http://localhost:3001${formData.geotag.foto_bukti_path}`}
                                                        alt="Bukti Kehadiran"
                                                        style={{ width: '150px', height: '200px', objectFit: 'cover', border: '1px solid #ccc', borderRadius: '4px' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.25rem' }}>
                                                            <strong>Waktu:</strong> {new Date(formData.geotag.waktu_checkin || formData.geotag.created_at).toLocaleString('id-ID')}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#555' }}>
                                                            <strong>Latitude:</strong> {formData.geotag.latitude}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#555' }}>
                                                            <strong>Longitude:</strong> {formData.geotag.longitude}
                                                        </div>
                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: 'green' }}>
                                                            ✓ Terverifikasi Sistem
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ width: '100%', height: '200px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <img
                                                        src={`https://staticmap.openstreetmap.de/staticmap.php?center=${formData.geotag.latitude},${formData.geotag.longitude}&zoom=15&size=600x200&maptype=mapnik&markers=${formData.geotag.latitude},${formData.geotag.longitude},lightblue`}
                                                        alt="Lokasi Geotagging"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '350px', textAlign: 'left' }}>
                                <p>{formData.tempat_dibuat}, {formData.tanggal_dibuat}</p>
                                <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Yang Membuat Laporan,</p>
                                {renderDigitalSignature(formData.nama, formData.nip)}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
