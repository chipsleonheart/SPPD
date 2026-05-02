import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-qr-code';

export default function Pertanggungjawaban() {
    const { authFetch, user, token } = useAuth();
    const [stList, setStList] = useState([]);
    const [sppdList, setSppdList] = useState([]);
    const [spjList, setSpjList] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
    const [editingSpjId, setEditingSpjId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [shouldPrint, setShouldPrint] = useState(false);
    const [shouldPrintNominatif, setShouldPrintNominatif] = useState(false);
    const [selectedNominatifNd, setSelectedNominatifNd] = useState(null);

    const initialFormState = {
        sppd_id: '', pegawai_id: '', no_spd: '', nama_pegawai: '', tujuan: '', no_st: '',
        lama_perjalanan: 3, tarif_uang_harian: 410000,
        biaya_tiket: 2500000, tarif_hotel: 850000, lama_menginap: 2, biaya_taksi: 300000,
        bukti_tiket: null, bukti_taksi: null, bukti_hotel: null
    };
    const [formData, setFormData] = useState(initialFormState);

    const loadMasterData = async () => {
        try {
            const [resST, resSPPD, resSPJ, resPeg] = await Promise.all([
                authFetch('/api/surat-tugas'),
                authFetch('/api/sppd'),
                authFetch('/api/spj'),
                authFetch('/api/pegawai')
            ]);

            const stData = await resST.json();
            const spdData = await resSPPD.json();
            const spjData = await resSPJ.json();
            const pegData = await resPeg.json();

            // Filter ST yang disetujui (diterbitkan)
            const activeST = stData.filter(st => st.status_persetujuan === 'DITERBITKAN');

            setStList(activeST);
            setSppdList(spdData.filter(s => s.status === 'DITERBITKAN'));
            setSpjList(spjData);
            setPegawaiList(pegData);
        } catch (err) { console.error('Gagal memuat data:', err); }
    };

    useEffect(() => {
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

    useEffect(() => {
        if (shouldPrintNominatif && selectedNominatifNd) {
            setTimeout(() => {
                window.print();
                setShouldPrintNominatif(false);
            }, 300);
        }
    }, [shouldPrintNominatif, selectedNominatifNd]);

    const getAssignedPegawaiWithSPD = (st) => {
        // Find existing SPDs linked to this Surat Tugas
        const relatedSpds = sppdList.filter(spd => spd.surat_tugas_id === st.id);

        const assigned = [];
        const seenIds = new Set();

        relatedSpds.forEach(spd => {
            const peg = pegawaiList.find(p => p.id === spd.pegawai_id) || { id: spd.pegawai_id, nama_lengkap: 'Unknown', nip: spd.pegawai_id };
            if (!seenIds.has(peg.id)) {
                seenIds.add(peg.id);
                // Attach the SPD object to the pegawai record for easy reference
                assigned.push({ ...peg, matchedSpd: spd });
            }
        });

        return assigned;
    };

    const handleBuatSpj = (st, pegAndSpd) => {
        setEditingSpjId(null);
        setFormData({
            ...initialFormState,
            sppd_id: pegAndSpd.matchedSpd.id,
            pegawai_id: pegAndSpd.id,
            no_spd: pegAndSpd.matchedSpd.nomor_spd,
            nama_pegawai: pegAndSpd.nama_lengkap,
            tujuan: pegAndSpd.matchedSpd.tempat_tujuan || st.nota_dinas?.tujuan || '',
            no_st: st.nomor_st
        });
        setViewMode('form');
    };

    const handleEditSpj = (existingSpj, st, pegAndSpd) => {
        setEditingSpjId(existingSpj.id);
        setFormData({
            sppd_id: existingSpj.sppd_id,
            pegawai_id: existingSpj.pegawai_id,
            no_spd: pegAndSpd.matchedSpd.nomor_spd,
            nama_pegawai: pegAndSpd.nama_lengkap,
            tujuan: pegAndSpd.matchedSpd.tempat_tujuan || st.nota_dinas?.tujuan || '',
            no_st: st.nomor_st,
            lama_perjalanan: existingSpj.uang_harian_jumlah_hari,
            tarif_uang_harian: existingSpj.uang_harian_tarif,
            biaya_tiket: existingSpj.biaya_transportasi_tiket,
            tarif_hotel: existingSpj.biaya_penginapan_tarif,
            lama_menginap: existingSpj.biaya_penginapan_jumlah_malam,
            biaya_taksi: existingSpj.biaya_transportasi_taksi,
            bukti_tiket: null, bukti_taksi: null, bukti_hotel: null
        });
        setViewMode('form');
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') setFormData(prev => ({ ...prev, [name]: files[0] }));
        else setFormData(prev => ({ ...prev, [name]: Number(value) || value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const submitData = new FormData();
        submitData.append('sppd_id', formData.sppd_id);
        submitData.append('pegawai_id', formData.pegawai_id);
        submitData.append('uang_harian_tarif', Number(formData.tarif_uang_harian) || 0);
        submitData.append('uang_harian_jumlah_hari', Number(formData.lama_perjalanan) || 0);
        submitData.append('biaya_transportasi_tiket', Number(formData.biaya_tiket) || 0);
        submitData.append('biaya_transportasi_taksi', Number(formData.biaya_taksi) || 0);
        submitData.append('biaya_penginapan_tarif', Number(formData.tarif_hotel) || 0);
        submitData.append('biaya_penginapan_jumlah_malam', Number(formData.lama_menginap) || 0);
        submitData.append('total_biaya_riil', Number(grandTotal) || 0);

        if (formData.bukti_tiket) submitData.append('tiket', formData.bukti_tiket);
        if (formData.bukti_taksi) submitData.append('taksi', formData.bukti_taksi);
        if (formData.bukti_hotel) submitData.append('hotel', formData.bukti_hotel);

        try {
            let response;
            const headers = {
                'Authorization': `Bearer ${token || ''}`,
                'x-st-number': formData.no_st
            };

            if (editingSpjId) {
                response = await fetch(`/api/spj/${editingSpjId}`, {
                    method: 'PUT',
                    headers,
                    body: submitData
                });
            } else {
                response = await fetch('/api/spj', {
                    method: 'POST',
                    headers,
                    body: submitData
                });
            }

            if (!response.ok) throw new Error('Gagal menyimpan SPJ');

            await loadMasterData();
            alert('Data Pertanggungjawaban (SPJ) Berhasil Disimpan!');
            setViewMode('list');
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan SPJ');
        } finally {
            setIsSaving(false);
        }
    };

    const ppkUser = pegawaiList.find(p => p.role === 'PPK') || { nama_lengkap: 'Siti Aminah, S.E.', nip: '-' };
    const bendaharaUser = pegawaiList.find(p => p.role === 'BENDAHARA_PENGELUARAN') || ppkUser;

    const currentPegawai = viewMode === 'form' ? pegawaiList.find(p => p.id === formData.pegawai_id) : null;
    const penerimaNip = currentPegawai?.nip || '-';

    const uangHarianTotal = formData.lama_perjalanan * formData.tarif_uang_harian;
    const hotelTotal = formData.lama_menginap * formData.tarif_hotel;
    const grandTotal = uangHarianTotal + formData.biaya_tiket + hotelTotal + formData.biaya_taksi;

    const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

    const renderDigitalSignature = (name, nip) => (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', maxWidth: '350px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                <QRCode value={window.location.origin + '/verifikasi/spd/' + formData.sppd_id} size={60} />
            </div>
            <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                Telah ditandatangani secara digital oleh:<br />
                <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{name}</span>
                NIP. {nip}
            </div>
        </div>
    );

    return (
        <div className="spj-page">
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{viewMode === 'list' ? 'Kelola Pertanggungjawaban (SPJ)' : (editingSpjId ? 'Edit SPJ' : 'Buat SPJ')}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{viewMode === 'list' ? 'Daftar Surat Tugas dan kelengkapan SPJ untuk setiap pegawai.' : 'Input rincian biaya perjalanan dinas berdasarkan standar biaya dan bukti pengeluaran.'}</p>
                </div>
                {viewMode === 'form' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => setViewMode('list')} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>Kembali</button>
                        <button onClick={handleSubmit} disabled={isSaving} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--success-color)', opacity: isSaving ? 0.7 : 1 }}>
                            <span style={{ marginRight: '0.5rem' }}>🖨️</span> {isSaving ? 'Menyimpan...' : 'Simpan & Cetak Rincian Biaya'}
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? (
                <div className="card no-print">
                    <div className="card-header">
                        <h2 className="card-title">Daftar Surat Tugas & Status SPJ</h2>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', width: '25%' }}>No. Surat Tugas</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', width: '30%' }}>Perihal</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', width: '45%' }}>Pegawai Pemilik SPD & Status SPJ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stList.length === 0 ? (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada Surat Tugas yang tersedia untuk Pertanggungjawaban.</td></tr>
                                    ) : (() => {
                                        const groupedByND = {};
                                        stList.forEach(st => {
                                            const ndId = st.nota_dinas_id;
                                            if (!groupedByND[ndId]) groupedByND[ndId] = { nd: st.nota_dinas, sts: [] };
                                            groupedByND[ndId].sts.push(st);
                                        });

                                        return Object.values(groupedByND).map(({ nd, sts }) => (
                                            sts.map((st, stIdx) => {
                                                const assignedWithSpd = getAssignedPegawaiWithSPD(st);
                                                return (
                                                    <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                                                        {stIdx === 0 && (
                                                            <td rowSpan={sts.length} style={{ padding: '1rem 1.5rem', borderRight: '1px solid var(--border-color)' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{nd?.nomor_nd}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{nd?.perihal}</div>
                                                                <div style={{ marginTop: '0.75rem' }}>
                                                                    <button onClick={() => { setSelectedNominatifNd({ nd, sts }); setShouldPrintNominatif(true); }} className="btn btn-sm" style={{ border: '1px solid var(--primary-color)', color: 'var(--primary-color)', backgroundColor: 'transparent', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>🖨️ Cetak Nominatif</button>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td style={{ padding: '1rem 1.5rem', borderRight: '1px solid var(--border-color)' }}>
                                                            <div style={{ fontWeight: 500, color: 'var(--primary-color)', fontSize: '0.875rem' }}>{st.nomor_st}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(st.tanggal_st).toLocaleDateString('id-ID')}</div>
                                                        </td>
                                                        <td style={{ padding: '0' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                {assignedWithSpd.length === 0 && (
                                                                    <div style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Belum ada SPD yang diterbitkan.</div>
                                                                )}
                                                                {assignedWithSpd.map((pegAndSpd, idx) => {
                                                                    const existingSpj = spjList.find(s => s.sppd_id === pegAndSpd.matchedSpd.id && s.pegawai_id === pegAndSpd.id);
                                                                    return (
                                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: idx < assignedWithSpd.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{pegAndSpd.nama_lengkap}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pegAndSpd.matchedSpd.nomor_spd}</div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                                <div style={{ fontSize: '0.8rem' }}>
                                                                                    {existingSpj ? (
                                                                                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--success-color)', color: 'white', fontWeight: 500 }}>Selesai</span>
                                                                                    ) : (
                                                                                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f59e0b', color: 'white', fontWeight: 500 }}>Belum SPJ</span>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    {existingSpj ? (
                                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                            <button onClick={() => { handleEditSpj(existingSpj, st, pegAndSpd); setShouldPrint(true); }} className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>🖨️ Cetak</button>
                                                                                            <button onClick={() => handleEditSpj(existingSpj, st, pegAndSpd)} className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️ Edit</button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button onClick={() => handleBuatSpj(st, pegAndSpd)} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Buat SPJ</button>
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
                    <div className="card no-print" style={{ marginBottom: '2rem' }}>
                        <div className="card-header">
                            <h2 className="card-title">Data Pengeluaran Riil (Sesuai Bukti)</h2>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nomor SPPD terkait</label>
                                        <div style={{ fontWeight: 600 }}>{formData.no_spd}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nomor Surat Tugas</label>
                                        <div style={{ fontWeight: 600 }}>{formData.no_st}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pegawai Ditugaskan</label>
                                        <div style={{ fontWeight: 600 }}>{formData.nama_pegawai}</div>
                                    </div>
                                </div>

                                {/* Uang Harian */}
                                <div className="form-group" style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: 'var(--secondary-color)', borderRadius: 'var(--radius-md)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>1. Uang Harian</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem', alignItems: 'end' }}>
                                        <div>
                                            <label className="form-label">Lama Perjalanan (Hari)</label>
                                            <input type="number" className="form-control" name="lama_perjalanan" value={formData.lama_perjalanan} onChange={handleChange} />
                                        </div>
                                        <div>
                                            <label className="form-label">Tarif SBM (Rp/Hari)</label>
                                            <input type="number" className="form-control" name="tarif_uang_harian" value={formData.tarif_uang_harian} onChange={handleChange} />
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.125rem', paddingBottom: '0.5rem' }}>
                                            Total: {formatRupiah(uangHarianTotal)}
                                        </div>
                                    </div>
                                </div>

                                {/* Transportasi */}
                                <div className="form-group" style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: 'var(--secondary-color)', borderRadius: 'var(--radius-md)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>2. Biaya Transportasi</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
                                        <div>
                                            <label className="form-label">Tiket Pesawat/KA (Rp)</label>
                                            <input type="number" className="form-control" name="biaya_tiket" value={formData.biaya_tiket} onChange={handleChange} />
                                        </div>
                                        <div>
                                            <label className="form-label">Taksi/BBM Kendaraan Dinas (Rp)</label>
                                            <input type="number" className="form-control" name="biaya_taksi" value={formData.biaya_taksi} onChange={handleChange} />
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.125rem', paddingBottom: '0.5rem' }}>
                                            Total: {formatRupiah(formData.biaya_tiket + formData.biaya_taksi)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Upload Bukti Tiket / Boarding Pass</label>
                                            <input type="file" className="form-control" name="bukti_tiket" onChange={handleChange} accept=".pdf,image/*" style={{ fontSize: '0.8rem', padding: '0.4rem' }} />
                                            {formData.bukti_tiket && <div style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginTop: '0.25rem' }}>✓ File terpilih: {formData.bukti_tiket.name}</div>}
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Upload Bukti Taksi / Struk BBM</label>
                                            <input type="file" className="form-control" name="bukti_taksi" onChange={handleChange} accept=".pdf,image/*" style={{ fontSize: '0.8rem', padding: '0.4rem' }} />
                                            {formData.bukti_taksi && <div style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginTop: '0.25rem' }}>✓ File terpilih: {formData.bukti_taksi.name}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Penginapan */}
                                <div className="form-group" style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: 'var(--secondary-color)', borderRadius: 'var(--radius-md)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>3. Biaya Penginapan / Hotel</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
                                        <div>
                                            <label className="form-label">Lama Menginap (Malam)</label>
                                            <input type="number" className="form-control" name="lama_menginap" value={formData.lama_menginap} onChange={handleChange} />
                                        </div>
                                        <div>
                                            <label className="form-label">Tarif Hotel Sesuai Bukti (Rp/Malam)</label>
                                            <input type="number" className="form-control" name="tarif_hotel" value={formData.tarif_hotel} onChange={handleChange} />
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.125rem', paddingBottom: '0.5rem' }}>
                                            Total: {formatRupiah(hotelTotal)}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Upload Kuitansi/Invoice Hotel</label>
                                        <input type="file" className="form-control" name="bukti_hotel" onChange={handleChange} accept=".pdf,image/*" style={{ fontSize: '0.8rem', padding: '0.4rem', width: '50%' }} />
                                        {formData.bukti_hotel && <div style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginTop: '0.25rem' }}>✓ File terpilih: {formData.bukti_hotel.name}</div>}
                                    </div>
                                </div>

                                <div style={{ gridColumn: 'span 2', textAlign: 'right', marginTop: '1rem', padding: '1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: 'var(--radius-md)' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 500, opacity: 0.9 }}>Total Biaya Keseluruhan</h2>
                                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{formatRupiah(grandTotal)}</div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* --- PRINT LAYOUT RINCIAN BIAYA SPJ --- */}
                    <div className="print-spj-container">
                        <style>
                            {`
                            @media print {
                                .spj-page > div:not(.print-spj-container) {
                                    display: none !important;
                                }
                                .print-spj-container {
                                    display: block !important;
                                    padding: 2cm;
                                    background: white;
                                    font-family: 'Times New Roman', Times, serif;
                                    font-size: 11pt;
                                }
                                .spj-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                                .spj-table th, .spj-table td { border: 1px solid black; padding: 0.5rem; }
                                .spj-table th { background-color: #f0f0f0; text-align: center; }
                            }
                            .print-spj-container {
                                display: none;
                            }
                            `}
                        </style>

                        <h2 style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', marginBottom: '2rem' }}>
                            RINCIAN BIAYA PERJALANAN DINAS
                        </h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <table style={{ border: 'none', width: '100%' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '200px' }}>Lampiran SPD Nomor</td>
                                        <td>: {formData.no_spd}</td>
                                    </tr>
                                    <tr>
                                        <td>Tanggal</td>
                                        <td>: {new Date().toISOString().split('T')[0]}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <table className="spj-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}>No.</th>
                                    <th style={{ width: '50%' }}>Perincian Biaya</th>
                                    <th style={{ width: '25%' }}>Jumlah</th>
                                    <th style={{ width: '20%' }}>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>1</td>
                                    <td>Uang Harian Perjalanan Dinas ({formData.lama_perjalanan} hari x {formatRupiah(formData.tarif_uang_harian)})</td>
                                    <td style={{ textAlign: 'right' }}>{formatRupiah(uangHarianTotal)}</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>2</td>
                                    <td>Biaya Transportasi (Tiket)</td>
                                    <td style={{ textAlign: 'right' }}>{formatRupiah(formData.biaya_tiket)}</td>
                                    <td>Sesuai Bukti</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>3</td>
                                    <td>Biaya Taksi Bandara / Stasiun</td>
                                    <td style={{ textAlign: 'right' }}>{formatRupiah(formData.biaya_taksi)}</td>
                                    <td>Sesuai Bukti</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>4</td>
                                    <td>Biaya Penginapan ({formData.lama_menginap} malam x {formatRupiah(formData.tarif_hotel)})</td>
                                    <td style={{ textAlign: 'right' }}>{formatRupiah(hotelTotal)}</td>
                                    <td>Sesuai Bukti</td>
                                </tr>
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', fontWeight: 'bold' }}>JUMLAH TOTAL</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatRupiah(grandTotal)}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ width: '280px', textAlign: 'center' }}>
                                <p>Telah Dibayar Sejumlah</p>
                                <p>{formatRupiah(grandTotal)}</p>
                                <p style={{ marginTop: '1rem' }}>Bendahara Pengeluaran</p>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {renderDigitalSignature(bendaharaUser.nama_lengkap, bendaharaUser.nip)}
                                </div>
                            </div>
                            <div style={{ width: '300px', textAlign: 'center' }}>
                                <p>Jakarta, {new Date().toISOString().split('T')[0]}</p>
                                <p>Telah Menerima Jumlah Uang Sebesar</p>
                                <p>{formatRupiah(grandTotal)}</p>
                                <p style={{ marginTop: '1rem' }}>Yang Menerima</p>
                                <br /><br /><br />
                                <p style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{formData.nama_pegawai}</p>
                                <p>NIP. {penerimaNip}</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
                            <p>PERHITUNGAN SPPD RAMPUNG</p>
                            <table style={{ margin: '0 auto', textAlign: 'left', width: '400px', marginTop: '1rem' }}>
                                <tbody>
                                    <tr>
                                        <td>Ditetapkan sejumlah</td>
                                        <td>: {formatRupiah(grandTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td>Yang telah dibayar semula</td>
                                        <td>: Rp 0</td>
                                    </tr>
                                    <tr>
                                        <td>Sisa kurang/lebih</td>
                                        <td>: {formatRupiah(grandTotal)}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ width: '300px', textAlign: 'center' }}>
                                    <p>Pejabat Pembuat Komitmen</p>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        {renderDigitalSignature(ppkUser.nama_lengkap, ppkUser.nip)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- PRINT LAYOUT DAFTAR NOMINATIF --- */}
            {viewMode === 'list' && selectedNominatifNd && (
                <div className="print-nominatif-container">
                    <style>
                        {`
                        @media print {
                            .spj-page > div:not(.print-nominatif-container) {
                                display: none !important;
                            }
                            .print-nominatif-container {
                                display: block !important;
                                padding: 1.5cm;
                                background: white;
                                font-family: 'Arial', sans-serif;
                                font-size: 10pt;
                            }
                            @page { size: landscape; margin: 1cm; }
                            .nominatif-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; margin-bottom: 2rem; }
                            .nominatif-table th, .nominatif-table td { border: 1px solid #444; padding: 0.5rem; text-align: left; }
                            .nominatif-table th { background-color: #f0f0f0; text-align: center; vertical-align: middle; font-weight: bold; }
                        }
                        .print-nominatif-container {
                            display: none;
                        }
                        `}
                    </style>

                    <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold' }}>DAFTAR NOMINATIF PENERIMAAN</h2>
                    <h3 style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'normal', marginTo: '0', marginBottom: '2rem' }}>BIAYA PERJALANAN DINAS</h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <table style={{ border: 'none', width: '100%', maxWidth: '800px', fontSize: '11pt' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '25%' }}>Mendasari Nota Dinas</td>
                                    <td style={{ width: '2%' }}>:</td>
                                    <td><strong>Nomor: {selectedNominatifNd.nd?.nomor_nd}</strong>, Tanggal: {selectedNominatifNd.nd?.tanggal_nd ? new Date(selectedNominatifNd.nd.tanggal_nd).toLocaleDateString('id-ID') : '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ width: '25%', verticalAlign: 'top' }}>Tanggal Pelaksanaan</td>
                                    <td style={{ width: '2%', verticalAlign: 'top' }}>:</td>
                                    <td>
                                        {selectedNominatifNd.nd?.tanggal_berangkat && selectedNominatifNd.nd?.tanggal_pulang ? (
                                            `${new Date(selectedNominatifNd.nd.tanggal_berangkat).toLocaleDateString('id-ID')} s.d. ${new Date(selectedNominatifNd.nd.tanggal_pulang).toLocaleDateString('id-ID')}`
                                        ) : '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ width: '25%', verticalAlign: 'top' }}>Mendasari Surat Tugas</td>
                                    <td style={{ width: '2%', verticalAlign: 'top' }}>:</td>
                                    <td>
                                        {selectedNominatifNd.sts.map(st => (
                                            <div key={st.id}><strong>Nomor: {st.nomor_st}</strong>, Tanggal: {st.tanggal_st ? new Date(st.tanggal_st).toLocaleDateString('id-ID') : '-'}</div>
                                        ))}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Maksud Perjalanan</td>
                                    <td>:</td>
                                    <td>{selectedNominatifNd.sts[0]?.menimbang || selectedNominatifNd.nd?.perihal || '-'}</td>
                                </tr>
                                <tr>
                                    <td>Tempat Tujuan</td>
                                    <td>:</td>
                                    <td>{selectedNominatifNd.nd?.tujuan || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <table className="nominatif-table">
                        <thead>
                            <tr>
                                <th rowSpan="2" style={{ width: '3%' }}>No</th>
                                <th rowSpan="2" style={{ width: '20%' }}>Nama Pegawai / NIP</th>
                                <th rowSpan="2" style={{ width: '10%' }}>Tingkat Biaya</th>
                                <th colSpan="3">Rincian Biaya Pengeluaran Riil (Rp)</th>
                                <th rowSpan="2" style={{ width: '15%' }}>Jumlah SPJ (Rp)</th>
                                <th rowSpan="2" style={{ width: '15%' }}>Tanda Tangan</th>
                            </tr>
                            <tr>
                                <th style={{ width: '12%' }}>Uang Harian</th>
                                <th style={{ width: '12%' }}>Transportasi</th>
                                <th style={{ width: '12%' }}>Penginapan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let globalIdx = 1;
                                let allRows = [];

                                selectedNominatifNd.sts.forEach(st => {
                                    const assignedPegawai = getAssignedPegawaiWithSPD(st);

                                    assignedPegawai.forEach(peg => {
                                        const spj = spjList.find(s => s.sppd_id === peg.matchedSpd.id && s.pegawai_id === peg.id);
                                        const uangHarian = spj ? (spj.uang_harian_jumlah_hari * spj.uang_harian_tarif) : 0;
                                        const transport = spj ? (spj.biaya_transportasi_tiket + spj.biaya_transportasi_taksi) : 0;
                                        const penginapan = spj ? (spj.biaya_penginapan_jumlah_malam * spj.biaya_penginapan_tarif) : 0;
                                        const totalPegawai = uangHarian + transport + penginapan;

                                        allRows.push(
                                            <tr key={`${st.id}-${peg.id}`}>
                                                <td style={{ textAlign: 'center' }}>{globalIdx++}</td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold' }}>{peg.nama_lengkap}</div>
                                                    <div style={{ fontSize: '0.85em', color: '#555' }}>NIP. {peg.nip}</div>
                                                    <div style={{ fontSize: '0.75em', color: 'var(--primary-color)', marginTop: '0.2rem' }}>ST: {st.nomor_st}</div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{peg.matchedSpd.tingkat_biaya}</td>
                                                <td style={{ textAlign: 'right' }}>{spj ? formatRupiah(uangHarian) : '-'}</td>
                                                <td style={{ textAlign: 'right' }}>{spj ? formatRupiah(transport) : '-'}</td>
                                                <td style={{ textAlign: 'right' }}>{spj ? formatRupiah(penginapan) : '-'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{spj ? formatRupiah(totalPegawai) : 'BELUM SPJ'}</td>
                                                <td style={{ textAlign: 'left', verticalAlign: 'top', height: '60px' }}>
                                                    <div style={{ fontSize: '0.8em', color: '#888' }}>{globalIdx - 1}. .....................</div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                });

                                if (allRows.length === 0) {
                                    return <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada data SPD diterbitkan untuk disajikan biayanya.</td></tr>;
                                }

                                return allRows;
                            })()}
                        </tbody>
                        <tfoot>
                            <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                                <td colSpan="6" style={{ textAlign: 'right', paddingRight: '1rem' }}>TOTAL DAFTAR NOMINATIF KESELURUHAN</td>
                                <td style={{ textAlign: 'right' }}>
                                    {(() => {
                                        let total = 0;
                                        selectedNominatifNd.sts.forEach(st => {
                                            const assignedPegawai = getAssignedPegawaiWithSPD(st);
                                            assignedPegawai.forEach(peg => {
                                                const spj = spjList.find(s => s.sppd_id === peg.matchedSpd.id && s.pegawai_id === peg.id);
                                                if (spj) {
                                                    total += (spj.uang_harian_jumlah_hari * spj.uang_harian_tarif) +
                                                        (spj.biaya_transportasi_tiket + spj.biaya_transportasi_taksi) +
                                                        (spj.biaya_penginapan_jumlah_malam * spj.biaya_penginapan_tarif);
                                                }
                                            });
                                        });
                                        return formatRupiah(total);
                                    })()}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', pageBreakInside: 'avoid' }}>
                        <div style={{ width: '40%', textAlign: 'center' }}>
                            <p style={{ marginBottom: '1rem' }}>Mengetahui/Menyetujui,<br />Pejabat Pembuat Komitmen</p>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                {renderDigitalSignature(ppkUser.nama_lengkap, ppkUser.nip)}
                            </div>
                        </div>
                        <div style={{ width: '40%', textAlign: 'center' }}>
                            <p style={{ marginBottom: '1rem' }}>Lunas Dibayar Tanggal ................<br />Bendahara Pengeluaran</p>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                {renderDigitalSignature(bendaharaUser.nama_lengkap, bendaharaUser.nip)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
