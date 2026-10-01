import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';

export default function VerifikasiST() {
    const { id } = useParams();
    const [st, setSt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [kpaUser, setKpaUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);

    useEffect(() => {
        const fetchST = async () => {
            try {
                const res = await fetch(`/api/public/surat-tugas/${id}`);
                if (!res.ok) {
                    throw new Error('Gagal mengambil data Surat Tugas.');
                }
                const data = await res.json();
                setSt(data);

                // Fetch potential approvers
                const resPegawai = await fetch('/api/pegawai');
                if (resPegawai.ok) {
                    const pegData = await resPegawai.json();
                    setPegawaiList(pegData);
                    const isKetuaApproval = data.status_persetujuan === 'MENUNGGU_KETUA'
                        || data.pegawai?.some(p => p.pegawai?.role === 'KETUA' || p.pegawai?.role === 'KOMISIONER');
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
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '0.2rem', margin: 0 }}>SURAT TUGAS</h2>
                    <p style={{ margin: 0 }}>Nomor: {st.nomor_st}</p>
                </div>

                <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '100px', verticalAlign: 'top' }}>Menimbang</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top', textAlign: 'justify' }}>
                                <ol style={{ listStyleType: 'lower-alpha', margin: 0, paddingLeft: '1.2rem', paddingBottom: 0 }}>
                                    <li style={{ paddingBottom: '0.2rem' }}>Keputusan Komisi Pemilihan Umum Nomor 409 Tahun 2022 tentang Pedoman Teknis Pelaksanaan Perjalanan Dinas Dalam Negeri Di Lingkungan Komisi Pemilihan Umum, Komisi Pemilihan Umum Provinsi, dan Komisi Pemilihan Umum Kabupaten/Kota;</li>
                                    <li style={{ paddingBottom: '0.2rem' }}>Bahwa untuk melaksanakan {st.menimbang || st.nota_dinas?.maksud || st.nota_dinas?.perihal};</li>
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
                                    <li>Nota Dinas Nomor {st.nota_dinas?.nomor_nd};</li>
                                </ol>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <p style={{ fontWeight: 'bold', margin: 0, fontSize: '12pt' }}>MEMBERI TUGAS</p>
                </div>

                <table style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '100px', verticalAlign: 'top' }}>Kepada</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top' }}>
                                {(() => {
                                    let pegList = [];
                                    if (st.pegawai?.length > 0) {
                                        const seen = new Set();
                                        pegList = st.pegawai.filter(p => {
                                            const name = p.pegawai?.nama_lengkap;
                                            if (!name || seen.has(name)) return false;
                                            seen.add(name);
                                            return true;
                                        }).map(p => p.pegawai);
                                    } else {
                                        const raw = st.nota_dinas?.pegawai_ditugaskan || '';
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
                                        <div style={{ marginBottom: '0.5rem' }}>Mengikuti Kegiatan {st.nota_dinas?.perihal} , yang dilaksanakan pada :</div>
                                        <table style={{ border: 'none', width: '100%', marginBottom: '0.5rem' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: '80px', padding: '0 0 0.2rem 0' }}>Hari</td>
                                                    <td style={{ width: '10px', padding: '0 0 0.2rem 0' }}>:</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>
                                                        {st.nota_dinas?.tanggal_berangkat && st.nota_dinas?.tanggal_pulang ? (
                                                            `${new Date(st.nota_dinas.tanggal_berangkat).toLocaleDateString('id-ID', { weekday: 'long' })} s.d ${new Date(st.nota_dinas.tanggal_pulang).toLocaleDateString('id-ID', { weekday: 'long' })}`
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>Tanggal</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>
                                                        {st.nota_dinas?.tanggal_berangkat && st.nota_dinas?.tanggal_pulang ? (
                                                            `${new Date(st.nota_dinas.tanggal_berangkat).getDate()} s.d ${new Date(st.nota_dinas.tanggal_pulang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>Pukul</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>{st.nota_dinas?.waktu_pelaksanaan || '......... WIB s.d Selesai'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>Tempat</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>:</td>
                                                    <td style={{ padding: '0 0 0.2rem 0' }}>{st.nota_dinas?.tujuan || 'Kantor KPU'}</td>
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
                        <p style={{ marginBottom: '0.5rem' }}>Pada Tanggal: {st.tanggal_st ? new Date(st.tanggal_st).toISOString().split('T')[0] : '-'}</p>
                        <p style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{st.status_persetujuan === 'MENUNGGU_KETUA' ? 'KETUA' : 'SEKRETARIS'}</p>

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
