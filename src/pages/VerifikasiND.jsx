import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';

export default function VerifikasiND() {
    const { id } = useParams();
    const [nd, setNd] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchND = async () => {
            try {
                const res = await fetch(`/api/public/nota-dinas/${id}`);
                if (!res.ok) throw new Error('Gagal mengambil data Nota Dinas.');
                const data = await res.json();
                setNd(data);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchND();
    }, [id]);

    if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Memuat data verifikasi...</div>;
    if (error || !nd) return <div style={{ padding: '3rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>{error || 'Data Nota Dinas tidak ditemukan.'}</div>;

    return (
        <div style={{ background: '#e0e0e0', minHeight: '100vh', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '210mm', minHeight: '297mm', padding: '2cm', background: 'white', boxShadow: '0 0 10px rgba(0,0,0,0.1)', fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: 1.5, color: '#000' }}>

                {/* Verification Badge */}
                <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '1rem', marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#155724' }}>✅ Dokumen Terverifikasi</div>
                    <div style={{ fontSize: '10pt', color: '#155724', marginTop: '0.25rem' }}>Nota Dinas ini telah ditandatangani secara elektronik dan sah.</div>
                </div>

                <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '0.5rem', margin: 0 }}>NOTA DINAS</h2>
                <p style={{ textAlign: 'center', margin: '0 0 2rem 0' }}>Nomor: {nd.nomor_nd}</p>

                <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '150px', verticalAlign: 'top' }}>Yth.</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top' }}>Pejabat Pembuat Komitmen</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Dari</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{nd.pengusul?.nama_lengkap || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tanggal</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{nd.tanggal_nd ? new Date(nd.tanggal_nd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Perihal</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem', fontWeight: 'bold' }}>{nd.perihal}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tujuan</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{nd.tujuan}</td>
                        </tr>
                    </tbody>
                </table>

                {nd.dasar && (
                    <div style={{ marginBottom: '1rem' }}>
                        <p><strong>Dasar:</strong> {nd.dasar}</p>
                    </div>
                )}

                {nd.maksud && (
                    <div style={{ marginBottom: '1rem' }}>
                        <p><strong>Maksud:</strong> {nd.maksud}</p>
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <p>Pegawai yang ditugaskan:</p>
                    <ol style={{ paddingLeft: '1.5rem' }}>
                        {nd.pegawai_ditugaskan?.split(' | ').map(n => n.trim()).filter(Boolean).map((peg, idx) => (
                            <li key={idx} style={{ marginBottom: '0.2rem' }}>{peg}</li>
                        ))}
                    </ol>
                </div>

                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '9pt', color: '#495057' }}>
                    <strong>Status Dokumen:</strong> {nd.status?.replace('_', ' ')} <br />
                    <strong>ID Dokumen:</strong> {nd.id}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
                    <div style={{ width: '350px', textAlign: 'left' }}>
                        <p>{nd.tujuan?.split(' / ')[0] || 'Jakarta'}, {nd.tanggal_nd ? new Date(nd.tanggal_nd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                        <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Pengusul,</p>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                <QRCode value={window.location.href} size={60} />
                            </div>
                            <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                                Telah ditandatangani secara digital oleh:<br />
                                <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{nd.pengusul?.nama_lengkap || '-'}</span>
                                NIP. {nd.pengusul?.nip || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
