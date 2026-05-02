import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';

export default function VerifikasiSPD() {
    const { id } = useParams();
    const [spd, setSpd] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [ppkUser, setPpkUser] = useState(null);

    useEffect(() => {
        const fetchSPD = async () => {
            try {
                const res = await fetch(`/api/public/sppd/${id}`);
                if (!res.ok) throw new Error('Gagal mengambil data SPPD.');
                const data = await res.json();
                setSpd(data);

                const resPeg = await fetch('/api/pegawai');
                if (resPeg.ok) {
                    const pegData = await resPeg.json();
                    setPpkUser(pegData.find(p => p.role === 'PPK'));
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSPD();
    }, [id]);

    if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Memuat data verifikasi...</div>;
    if (error || !spd) return <div style={{ padding: '3rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>{error || 'Data SPPD tidak ditemukan.'}</div>;

    return (
        <div style={{ background: '#e0e0e0', minHeight: '100vh', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '210mm', minHeight: '297mm', padding: '2cm', background: 'white', boxShadow: '0 0 10px rgba(0,0,0,0.1)', fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: 1.5, color: '#000' }}>

                {/* Verification Badge */}
                <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '1rem', marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#155724' }}>✅ Dokumen Terverifikasi</div>
                    <div style={{ fontSize: '10pt', color: '#155724', marginTop: '0.25rem' }}>Surat Perjalanan Dinas ini telah ditandatangani secara elektronik dan sah.</div>
                </div>

                {/* KOP SURAT KPU */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
                    <div style={{ flex: '0 0 100px', textAlign: 'center' }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/KPU_Logo.svg" alt="Logo KPU" style={{ width: '80px', height: 'auto' }} onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                    <div style={{ flex: '1', textAlign: 'center', lineHeight: '1.2' }}>
                        <h1 style={{ margin: 0, fontSize: '16pt', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>KOMISI PEMILIHAN UMUM</h1>
                        <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>KABUPATEN MOJOKERTO</h2>
                        <p style={{ margin: '5px 0 0 0', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>
                            Alamat : Jl. R.A.A.K. Adinegoro Nomor. 1-2 Sooko, Mojokerto<br />
                            Telp. (0321) 320562, Fax. (0321) 320562<br />
                            Website : www.kpu-mojokertokab.go.id, email : @kpu-mojokertokab.go.id
                        </p>
                    </div>
                    <div style={{ flex: '0 0 100px' }}></div>
                </div>

                <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '0.5rem', margin: 0 }}>SURAT PERJALANAN DINAS (SPD)</h2>
                <p style={{ textAlign: 'center', margin: '0 0 2rem 0' }}>Nomor: {spd.nomor_spd}</p>

                <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '200px', verticalAlign: 'top' }}>Pejabat Pembuat Komitmen</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top' }}>{ppkUser?.nama_lengkap || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Nama Pegawai</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem', fontWeight: 'bold' }}>{spd.pegawai?.nama_lengkap || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>NIP</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.pegawai?.nip || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Pangkat / Golongan</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.pegawai?.pangkat_golongan || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Jabatan</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.pegawai?.jabatan || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tingkat Biaya</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.tingkat_biaya}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Alat Angkutan</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.alat_angkutan}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tempat Berangkat</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.tempat_berangkat}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tempat Tujuan</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem', fontWeight: 'bold' }}>{spd.tempat_tujuan}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tanggal Berangkat</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.tanggal_berangkat ? new Date(spd.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Tanggal Kembali</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.tanggal_kembali ? new Date(spd.tanggal_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Mendasari Surat Tugas</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>{spd.surat_tugas?.nota_dinas?.nomor_nd || '-'}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '9pt', color: '#495057' }}>
                    <strong>Status Dokumen:</strong> {spd.status} <br />
                    <strong>ID Dokumen:</strong> {spd.id}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
                    <div style={{ width: '350px', textAlign: 'left' }}>
                        <p>Dikeluarkan di: Jakarta</p>
                        <p>Pada Tanggal: {spd.tanggal_berangkat ? new Date(spd.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                        <p style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Pejabat Pembuat Komitmen</p>

                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                <QRCode value={window.location.href} size={60} />
                            </div>
                            <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                                Telah ditandatangani secara digital oleh:<br />
                                <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{ppkUser?.nama_lengkap || '-'}</span>
                                NIP. {ppkUser?.nip || '-'}
                            </div>
                        </div>

                        <p style={{ fontWeight: 'bold', margin: '0.5rem 0 0 0', textDecoration: 'underline' }}>{ppkUser?.nama_lengkap || '-'}</p>
                        <p style={{ margin: 0 }}>NIP. {ppkUser?.nip || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
