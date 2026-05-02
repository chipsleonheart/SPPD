import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-qr-code';

export default function SuratTugas() {
    const { user, authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState(user?.role === 'PEGAWAI' ? 'terbit' : 'approval');
    const [selectedST, setSelectedST] = useState(null);
    const [stList, setStList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Approval State
    const [isSigning, setIsSigning] = useState(false);
    const [pegawaiList, setPegawaiList] = useState([]);

    // Helper: Hitung Lama Perjalanan (Hari) dan Konversi Angka ke Huruf
    const numberToWords = (num) => {
        const words = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
        if (num <= 11) return words[num];
        if (num <= 19) return words[num - 10] + ' Belas';
        if (num <= 99) return words[Math.floor(num / 10)] + ' Puluh' + (num % 10 > 0 ? ' ' + words[num % 10] : '');
        return num.toString();
    };

    const calculateDays = (start, end) => {
        if (!start || !end) return '0 Hari';
        const date1 = new Date(start);
        const date2 = new Date(end);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
        return `${diffDays} (${numberToWords(diffDays)}) Hari`;
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [resND, resST, resPegawai] = await Promise.all([
                authFetch('/api/nota-dinas'),
                authFetch('/api/surat-tugas'),
                authFetch('/api/pegawai')
            ]);
            const dsND = await resND.json();
            const dsST = await resST.json();
            const pegData = await resPegawai.json();
            setPegawaiList(pegData);

            const combined = [];

            // Group ST by Nota Dinas ID first
            const stGroupedByND = {};
            dsST.forEach(st => {
                if (!stGroupedByND[st.nota_dinas_id]) stGroupedByND[st.nota_dinas_id] = [];
                stGroupedByND[st.nota_dinas_id].push(st);
            });

            dsND.forEach(nd => {
                const relatedSTs = stGroupedByND[nd.id] || [];

                if (nd.status === 'DIAJUKAN' && relatedSTs.length === 0) {
                    combined.push({
                        id: nd.id,
                        no_nd: nd.nomor_nd,
                        perihal: nd.perihal,
                        pengusul: nd.pengusul?.nama_lengkap || 'Unknown',
                        pegawai_ditugaskan: nd.pegawai_ditugaskan || '',
                        tujuan: nd.tujuan,
                        status: 'Menunggu PPK',
                        type: 'ND',
                        raw: nd
                    });
                }

                relatedSTs.forEach(st => {
                    let statusText = 'ST Terbit';
                    if (st.status_persetujuan === 'MENUNGGU_KPA') statusText = 'Menunggu Sekretaris';
                    if (st.status_persetujuan === 'MENUNGGU_KETUA') statusText = 'Menunggu Ketua';

                    combined.push({
                        id: st.id,
                        nota_dinas_id: nd.id,
                        no_nd: nd.nomor_nd,
                        perihal: nd.perihal,
                        pengusul: nd.pengusul?.nama_lengkap || 'Unknown',
                        pegawai_ditugaskan: st.pegawai?.map(p => p.pegawai.nama_lengkap).join(' | ') || nd.pegawai_ditugaskan || '',
                        tujuan: nd.tujuan,
                        status: statusText,
                        type: 'ST',
                        rawST: st,
                        rawND: nd
                    });
                });
            });

            setStList(combined);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadData(); }, []);

    const handleApproval = async (id, role, type) => {
        if (!window.confirm('Apakah Anda yakin ingin menyetujui dokumen ini?')) return;
        setIsSigning(true);
        try {
            if (role === 'PPK' && type === 'ND') {
                const item = stList.find(x => x.id === id && x.type === 'ND');
                const rawPegawai = item.pegawai_ditugaskan.split('|').map(n => n.trim()).filter(Boolean);

                // Categorize pegawai
                const groupKetua = [];
                const groupSekretaris = [];

                rawPegawai.forEach(pName => {
                    const peg = pegawaiList.find(p => p.nama_lengkap.toLowerCase().includes(pName.toLowerCase()));
                    if (peg && (peg.role === 'KETUA' || peg.role === 'KOMISIONER')) {
                        groupKetua.push(peg);
                    } else {
                        // Default to sekretaris group if not found or other roles
                        groupSekretaris.push(peg || { id: pName, nama_lengkap: pName });
                    }
                });

                const createST = async (pegawaiGroup, targetRole) => {
                    const resST = await authFetch('/api/surat-tugas', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nota_dinas_id: id,
                            nomor_st: `ST/${Math.floor(Math.random() * 1000)}/2026`,
                            tanggal_st: new Date().toISOString(),
                            menimbang: item.raw.maksud || item.perihal,
                            dasar: item.raw.dasar || `Nota Dinas ${item.no_nd}`,
                            untuk: `Melaksanakan perjalanan dinas ke ${item.tujuan}`,
                            status_persetujuan: targetRole === 'KETUA' ? 'MENUNGGU_KETUA' : 'MENUNGGU_KPA'
                        })
                    });
                    const stData = await resST.json();

                    // Attach pegawai to ST
                    for (const p of pegawaiGroup) {
                        if (p.id && !p.id.toString().startsWith('unknown')) {
                            await authFetch('/api/surat-tugas-pegawai', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ surat_tugas_id: stData.id, pegawai_id: p.id })
                            });
                        }
                    }
                };

                if (groupKetua.length > 0) await createST(groupKetua, 'KETUA');
                if (groupSekretaris.length > 0) await createST(groupSekretaris, 'KPA');

                await authFetch(`/api/nota-dinas/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'DISETUJUI_PPK' })
                });
            } else if (role === 'KPA' && type === 'ST') {
                await authFetch(`/api/surat-tugas/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'DITERBITKAN' })
                });
            } else if (role === 'KETUA' && type === 'ST') {
                await authFetch(`/api/surat-tugas/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'DITERBITKAN' })
                });
            }
            alert(`Dokumen berhasil disetujui!`);
            loadData();
        } catch (error) {
            console.error('Gagal:', error);
            alert('Terjadi kesalahan jaringan.');
        } finally {
            setIsSigning(false);
        }
    };

    // Derive approval button visibility from the actual logged-in user role
    const canApprovePPK = user?.role === 'PPK' || user?.role === 'ADMIN';
    const canApproveKPA = user?.role === 'KPA' || user?.role === 'ADMIN';
    const canApproveKETUA = user?.role === 'KETUA' || user?.role === 'ADMIN';

    const handleCetakST = (st) => {
        setSelectedST(st);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    // Cek apakah ST ini untuk Ketua: dari status display, status_persetujuan, atau role pegawai yang ditugaskan
    const isKetuaST = selectedST?.status === 'Menunggu Ketua'
        || selectedST?.rawST?.status_persetujuan === 'MENUNGGU_KETUA'
        || selectedST?.rawST?.pegawai?.some(p => p.pegawai?.role === 'KETUA' || p.pegawai?.role === 'KOMISIONER');

    const approverUser = isKetuaST
        ? pegawaiList.find(p => p.role === 'KETUA')
        : pegawaiList.find(p => p.role === 'KPA');

    // QR code is directly embedded below instead of SVG.

    return (
        <div className="st-page">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Persetujuan & Penerbitan Surat Tugas</h1>
                <p style={{ color: 'var(--text-muted)' }}>Approval berjenjang Surat Tugas oleh PPK dan Sekretaris.</p>
            </div>

            {/* Removed Passphrase Modal */}

            {user?.role !== 'PEGAWAI' && (
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                    <button
                        className={`btn ${activeTab === 'approval' ? '' : 'btn-outline'}`}
                        style={{
                            borderRadius: '0',
                            borderBottom: activeTab === 'approval' ? '2px solid var(--primary-color)' : 'none',
                            color: activeTab === 'approval' ? 'var(--primary-color)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'approval' ? 600 : 500,
                            paddingBottom: '0.75rem', border: 'none', background: 'transparent'
                        }}
                        onClick={() => setActiveTab('approval')}
                    >
                        Daftar Persetujuan
                    </button>
                    <button
                        className={`btn ${activeTab === 'terbit' ? '' : 'btn-outline'}`}
                        style={{
                            borderRadius: '0',
                            borderBottom: activeTab === 'terbit' ? '2px solid var(--primary-color)' : 'none',
                            color: activeTab === 'terbit' ? 'var(--primary-color)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'terbit' ? 600 : 500,
                            paddingBottom: '0.75rem', border: 'none', background: 'transparent'
                        }}
                        onClick={() => setActiveTab('terbit')}
                    >
                        Surat Tugas Terbit
                    </button>
                </div>
            )}

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>No. Nota Dinas</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Perihal</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pengusul / Tujuan</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</td></tr>
                            ) : stList.filter(st => activeTab === 'approval' ? st.status.includes('Menunggu') : st.status === 'ST Terbit').map((st) => (
                                <tr key={`${st.type}-${st.id}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{st.no_nd}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{st.perihal}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {st.pengusul}<br />
                                        <span style={{ fontSize: '0.75rem' }}>Ke: {st.tujuan}</span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: st.status === 'ST Terbit' ? 'var(--success-color)' : 'var(--warning-color)',
                                            color: '#fff'
                                        }}>
                                            {st.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        {activeTab === 'approval' && st.status === 'Menunggu PPK' && canApprovePPK && (
                                            <button onClick={() => handleApproval(st.id, 'PPK', st.type)} disabled={isSigning} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', opacity: isSigning ? 0.7 : 1 }}>Setujui (PPK)</button>
                                        )}
                                        {activeTab === 'approval' && st.status === 'Menunggu Sekretaris' && canApproveKPA && (
                                            <button onClick={() => handleApproval(st.id, 'KPA', st.type)} disabled={isSigning} className="btn btn-primary" style={{ backgroundColor: 'var(--success-color)', fontSize: '0.75rem', padding: '0.4rem 0.75rem', opacity: isSigning ? 0.7 : 1 }}>Setujui (Sekretaris)</button>
                                        )}
                                        {activeTab === 'approval' && st.status === 'Menunggu Ketua' && canApproveKETUA && (
                                            <button onClick={() => handleApproval(st.id, 'KETUA', st.type)} disabled={isSigning} className="btn btn-primary" style={{ backgroundColor: '#1e3a8a', fontSize: '0.75rem', padding: '0.4rem 0.75rem', opacity: isSigning ? 0.7 : 1 }}>Setujui (Ketua)</button>
                                        )}
                                        {activeTab === 'terbit' && (
                                            <button onClick={() => handleCetakST(st)} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                                                <span style={{ marginRight: '0.25rem' }}>🖨️</span> Cetak ST
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && stList.filter(st => activeTab === 'approval' ? st.status.includes('Menunggu') : st.status === 'ST Terbit').length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        Tidak ada data {activeTab === 'approval' ? 'yang menunggu persetujuan' : 'Surat Tugas yang diterbitkan'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print ST Layout */}
            <style>
                {`
                    @media print {
                        .st-page > div:not(.print-st-container) {
                            display: none !important;
                        }
                        .print-st-container {
                            display: block !important;
                            font-family: 'Times New Roman', Times, serif;
                            font-size: 11pt;
                            line-height: 1.5;
                            padding: 2cm;
                            background: white;
                        }
                    }
                    .print-st-container {
                        display: none;
                    }
                `}
            </style>

            {selectedST && (
                <div className="print-st-container">
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

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '0.2rem' }}>SURAT TUGAS</h2>
                        <p style={{ margin: 0 }}>Nomor: {selectedST.id.toString().padStart(3, '0')}/ST/2026</p>
                    </div>

                    <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '100px', verticalAlign: 'top' }}>Menimbang</td>
                                <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                                <td style={{ verticalAlign: 'top', textAlign: 'justify' }}>
                                    <ol style={{ listStyleType: 'lower-alpha', margin: 0, paddingLeft: '1.2rem', paddingBottom: 0 }}>
                                        <li style={{ paddingBottom: '0.2rem' }}>Keputusan Komisi Pemilihan Umum Nomor 409 Tahun 2022 tentang Pedoman Teknis Pelaksanaan Perjalanan Dinas Dalam Negeri Di Lingkungan Komisi Pemilihan Umum, Komisi Pemilihan Umum Provinsi, dan Komisi Pemilihan Umum Kabupaten/Kota;</li>
                                        <li style={{ paddingBottom: '0.2rem' }}>Bahwa untuk melaksanakan {selectedST.rawST?.menimbang || selectedST.rawND?.maksud || selectedST.perihal};</li>
                                        <li>Bahwa untuk melaksanakan sebagaimana huruf a dan b tersebut, perlu menerbitkan surat tugas;</li>
                                    </ol>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>Dasar</td>
                                <td style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>:</td>
                                <td style={{ verticalAlign: 'top', paddingTop: '0.5rem', textAlign: 'justify' }}>
                                    <ol style={{ margin: 0, paddingLeft: '1.2rem', paddingBottom: 0 }}>
                                        <li style={{ paddingBottom: '0.2rem' }}>Undang-Undang Nomor 7 Tahun 2017 tentang Pemilihan Umum;</li>
                                        <li style={{ paddingBottom: '0.2rem' }}>Peraturan Komisi Pemilihan Umum Nomor 8 Tahun 2019 tentang Tata Kerja Komisi Pemilihan Umum, Komisi Pemilihan Umum Provinsi, dan Komisi Pemilihan Umum Kabupaten/Kota sebagaimana telah beberapa kali diubah terakhir dengan Peraturan Komisi Pemilihan Umum Nomor 12 Tahun 2023 tentang Perubahan Kelima atas Peraturan Komisi Pemilihan Umum Nomor 8 Tahun 2019 tentang Tata Kerja Komisi Pemilihan Umum, Komisi Pemilihan Umum Provinsi, dan Komisi Pemilihan Umum Kabupaten Kota;</li>
                                        <li style={{ paddingBottom: '0.2rem' }}>Peraturan Menteri Keuangan Nomor 113/PMK.05/2012 tentang Perjalanan Dinas Dalam Negeri Bagi Pejabat Negara, Pegawai Negeri dan Pegawai Tidak Tetap;</li>
                                        <li style={{ paddingBottom: '0.2rem' }}>Peraturan Menteri Keuangan Republik Indonesia Nomor 49 PMK.02/2023 Tahun 2023 tentang Standar Biaya Masukan Tahun Anggaran 2024;</li>
                                        <li style={{ paddingBottom: '0.2rem' }}>Peraturan Direktur Jenderal Perbendaharaan Nomor PER- 22/PB/2013 Tentang Ketentuan Lebih Lanjut Pelaksanaan Perjalanan Dinas dalam Negeri Bagi Pejabat Negara, Pegawai Negeri dan Pegawai Tidak Tetap;</li>
                                        <li style={{ paddingBottom: '0.2rem' }}>Keputusan Komisi Pemilihan Umum Nomor 409 Tahun 2022 tentang Pedoman Teknis Pelaksanaan Perjalanan Dinas Dalam Negeri Di Lingkungan Komisi Pemilihan Umum, Komisi Pemilihan Umum Provinsi, dan Komisi Pemilihan Umum Kabupaten/Kota;</li>
                                        <li>Nota Dinas Nomor {selectedST.no_nd};</li>
                                    </ol>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '12pt' }}>MEMBERI TUGAS</p>
                    </div>

                    <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '100px', verticalAlign: 'top' }}>Kepada</td>
                                <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                                <td style={{ verticalAlign: 'top' }}>
                                    {(() => {
                                        let pegList = [];
                                        if (selectedST.rawST?.pegawai?.length > 0) {
                                            const seen = new Set();
                                            pegList = selectedST.rawST.pegawai.filter(p => {
                                                const name = p.pegawai?.nama_lengkap;
                                                if (!name || seen.has(name)) return false;
                                                seen.add(name);
                                                return true;
                                            }).map(p => p.pegawai);
                                        } else {
                                            const raw = selectedST.pegawai_ditugaskan || '';
                                            const names = [...new Set(raw.split('|').map(n => n.trim()).filter(Boolean))];
                                            pegList = names.map(name => {
                                                const match = pegawaiList.find(pl => pl.nama_lengkap.toLowerCase().includes(name.toLowerCase()));
                                                return match || { nama_lengkap: name, nip: '-', pangkat_golongan: '-', jabatan: '-' };
                                            });
                                        }

                                        return pegList.map((peg, idx) => (
                                            <div key={idx} style={{ marginBottom: idx < pegList.length - 1 ? '1rem' : '0', display: 'flex' }}>
                                                <div style={{ width: '25px', fontWeight: 'bold' }}>{idx + 1}.</div>
                                                <table style={{ border: 'none', width: '100%' }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ width: '130px', padding: '0 0 0.2rem 0' }}>Nama</td>
                                                            <td style={{ width: '10px', padding: '0 0 0.2rem 0' }}>:</td>
                                                            <td style={{ padding: '0 0 0.2rem 0', fontWeight: 'bold' }}>{peg.nama_lengkap}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '0 0 0.2rem 0' }}>NIP</td>
                                                            <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                            <td style={{ padding: '0 0 0.2rem 0' }}>{peg.nip || '-'}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '0 0 0.2rem 0' }}>Pangkat/Gol.</td>
                                                            <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                            <td style={{ padding: '0 0 0.2rem 0' }}>{peg.pangkat_golongan || '-'}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '0' }}>Jabatan</td>
                                                            <td style={{ padding: '0' }}>:</td>
                                                            <td style={{ padding: '0' }}>{peg.jabatan || '-'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        ));
                                    })()}
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
                                    <ol style={{ margin: 0, paddingLeft: '1.2rem', textAlign: 'justify' }}>
                                        <li style={{ marginBottom: '0.25rem' }}>
                                            <div style={{ marginBottom: '0.5rem' }}>Mengikuti Kegiatan {selectedST.perihal} , yang dilaksanakan pada :</div>
                                            <table style={{ border: 'none', width: '100%', marginBottom: '0.5rem' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ width: '80px', padding: '0 0 0.2rem 0' }}>Hari</td>
                                                        <td style={{ width: '10px', padding: '0 0 0.2rem 0' }}>:</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>
                                                            {selectedST.rawND?.tanggal_berangkat && selectedST.rawND?.tanggal_pulang ? (
                                                                `${new Date(selectedST.rawND.tanggal_berangkat).toLocaleDateString('id-ID', { weekday: 'long' })} s.d ${new Date(selectedST.rawND.tanggal_pulang).toLocaleDateString('id-ID', { weekday: 'long' })}`
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>Tanggal</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>
                                                            {selectedST.rawND?.tanggal_berangkat && selectedST.rawND?.tanggal_pulang ? (
                                                                `${new Date(selectedST.rawND.tanggal_berangkat).getDate()} s.d ${new Date(selectedST.rawND.tanggal_pulang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>Pukul</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>{selectedST.rawND?.waktu_pelaksanaan || '......... WIB s.d Selesai'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>Tempat</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                        <td style={{ padding: '0 0 0.2rem 0' }}>{selectedST.tujuan || 'Kantor KPU'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </li>
                                        <li style={{ marginBottom: '0.25rem' }}>Melaksanakan perjalanan dinas jabatan dengan pembebanan Pada DIPA KPU Kabupaten Mojokerto.</li>
                                        <li>Melaksanakan tugas dengan penuh tanggungjawab dan menyampaikan hasil penugasan dalam rapat pleno pimpinan.</li>
                                    </ol>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <div style={{ width: '350px', textAlign: 'left' }}>
                            <p style={{ margin: 0 }}>Dikeluarkan di: Jakarta</p>
                            <p style={{ marginBottom: '0.5rem' }}>Pada Tanggal: {new Date().toISOString().split('T')[0]}</p>
                            <p style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{isKetuaST ? 'KETUA' : 'SEKRETARIS'}</p>

                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #666', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                    <QRCode value={window.location.origin + '/verifikasi/st/' + selectedST.id} size={60} />
                                </div>
                                <div style={{ fontSize: '8pt', lineHeight: 1.3, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
                                    Telah ditandatangani secara digital oleh:<br />
                                    <span style={{ fontWeight: 'bold', fontSize: '9pt', display: 'block', marginTop: '0.2rem' }}>{approverUser?.nama_lengkap || (isKetuaST ? 'Ketua' : 'Sekretaris')}</span>
                                    NIP. {approverUser?.nip || '-'}
                                </div>
                            </div>

                            <p style={{ fontWeight: 'bold', margin: '0.5rem 0 0 0', textDecoration: 'underline' }}>{approverUser?.nama_lengkap || (isKetuaST ? 'Ketua' : 'Sekretaris')}</p>
                            <p style={{ margin: 0 }}>NIP. {approverUser?.nip || '-'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
