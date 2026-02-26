import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { authFetch } = useAuth();
    const [stats, setStats] = useState([
        { title: 'SPD Aktif', value: '0', color: 'var(--primary-color)' },
        { title: 'Menunggu Persetujuan', value: '0', color: 'var(--warning-color)' },
        { title: 'Total Perjalanan (Bulan Ini)', value: '0', color: 'var(--success-color)' },
    ]);
    const [recentST, setRecentST] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        authFetch('http://localhost:3001/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                setStats([
                    { title: 'SPD Aktif (Diterbitkan)', value: data.sppdAktif.toString(), color: 'var(--primary-color)' },
                    { title: 'Menunggu Persetujuan (ND/ST)', value: data.persetujuan.toString(), color: 'var(--warning-color)' },
                    { title: 'Total Perjalanan', value: data.totalPerjalanan.toString(), color: 'var(--success-color)' },
                ]);
                setRecentST(data.recentST || []);
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="dashboard">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard Overview</h1>
                <p style={{ color: 'var(--text-muted)' }}>Ringkasan aktivitas perjalanan dinas instansi Anda.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {stats.map((stat, idx) => (
                    <div key={idx} className="card">
                        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', backgroundColor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ width: 20, height: 20, backgroundColor: stat.color, borderRadius: '50%' }}></span>
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{stat.title}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>{stat.value}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Perjalanan Dinas Terbaru</h2>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Nomor Surat</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Nama ASN</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Tujuan</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Memuat data...</td></tr> : recentST.length === 0 ? <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Belum ada data perjalanan dinas terbaru.</td></tr> : recentST.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{row.nomor_st}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{row.nota_dinas?.pengusul?.nama_lengkap || 'Admin'}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{row.nota_dinas?.tujuan}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: row.status_persetujuan === 'DITERBITKAN' ? 'var(--success-color)' : 'var(--warning-color)',
                                            color: '#fff'
                                        }}>
                                            {row.status_persetujuan}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
