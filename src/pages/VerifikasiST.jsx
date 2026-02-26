import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';

export default function VerifikasiST() {
    const { id } = useParams();
    const [st, setSt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [kpaUser, setKpaUser] = useState(null);

    useEffect(() => {
        const fetchST = async () => {
            try {
                const res = await fetch(`http://localhost:3001/api/public/surat-tugas/${id}`);
                if (!res.ok) {
                    throw new Error('Gagal mengambil data Surat Tugas.');
                }
                const data = await res.json();
                setSt(data);

                // Fetch potential approvers
                const resPegawai = await fetch('http://localhost:3001/api/pegawai');
                if (resPegawai.ok) {
                    const pegData = await resPegawai.json();
                    const isKetuaApproval = data.status_persetujuan === 'MENUNGGU_KETUA';
                    setKpaUser(pegData.find(p => p.role === (isKetuaApproval ? 'KETUA' : 'KPA')));
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchST();
    }, [id]);

    if (isLoading) {
        return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Memuat data verifikasi...</div>;
    }

    if (error || !st) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>{error || 'Data Surat Tugas tidak ditemukan.'}</div>;
    }

    // Static display exactly like print
    return (
        <div style={{ background: '#e0e0e0', minHeight: '100vh', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '2cm',
                background: 'white',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: '11pt',
                lineHeight: 1.5,
                color: '#000'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '0.5rem', margin: 0 }}>SURAT TUGAS</h2>
                    <p style={{ margin: 0 }}>Nomor: {st.nomor_st}</p>
                </div>

                <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '100px', verticalAlign: 'top' }}>Menimbang</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top' }}>bahwa sehubungan dengan {st.nota_dinas?.perihal} di {st.nota_dinas?.tujuan}, dipandang perlu menugaskan Pegawai Negeri Sipil yang namanya tersebut dalam surat ini;</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Dasar</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Nota Dinas Nomor {st.nota_dinas?.nomor_nd};</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>MEMBERI TUGAS</p>
                </div>

                <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '100px', verticalAlign: 'top' }}>Kepada</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top' }}>
                                <ol style={{ margin: 0, paddingLeft: '1.2rem', fontWeight: 'bold' }}>
                                    {st.nota_dinas?.pegawai_ditugaskan?.includes('|') ? st.nota_dinas.pegawai_ditugaskan.split(' | ').map((pegawai, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{pegawai.trim()}</li>
                                    )) : st.nota_dinas?.pegawai_ditugaskan?.split(',').map((pegawai, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{pegawai.trim()}</li>
                                    ))}
                                </ol>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', marginBottom: '3rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '100px', verticalAlign: 'top' }}>Untuk</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top' }}>
                                1. Melaksanakan tugas {st.nota_dinas?.perihal} di {st.nota_dinas?.tujuan}.<br />
                                2. Tugas ini dilaksanakan dengan penuh tanggung jawab.
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4rem' }}>
                    <div style={{ width: '350px', textAlign: 'left' }}>
                        <p style={{ margin: 0 }}>Dikeluarkan di: Jakarta</p>
                        <p style={{ margin: 0 }}>Pada Tanggal: {st.tanggal_st ? new Date(st.tanggal_st).toISOString().split('T')[0] : '-'}</p>
                        <p style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{st.status_persetujuan === 'MENUNGGU_KETUA' ? 'Ketua' : 'Sekretaris'}</p>

                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                <QRCode value={window.location.href} size={60} />
                            </div>
                            <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                                Telah ditandatangani secara digital oleh:<br />
                                <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{kpaUser?.nama_lengkap || 'Sekretaris'}</span>
                                NIP. {kpaUser?.nip || '-'}
                            </div>
                        </div>

                        <p style={{ fontWeight: 'bold', margin: '0.5rem 0 0 0', textDecoration: 'underline' }}>{kpaUser?.nama_lengkap || (st.status_persetujuan === 'MENUNGGU_KETUA' ? 'Ketua' : 'Sekretaris')}</p>
                        <p style={{ margin: 0 }}>NIP. {kpaUser?.nip || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
