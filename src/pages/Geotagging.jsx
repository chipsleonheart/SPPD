import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Geotagging() {
    const { authFetch, user } = useAuth();
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [photo, setPhoto] = useState(null);
    const [checkinData, setCheckinData] = useState(null);
    const [sppdList, setSppdList] = useState([]);
    const [selectedSppdId, setSelectedSppdId] = useState('');
    const [historyList, setHistoryList] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Load SPD + history
    useEffect(() => {
        if (!user?.id) return;
        const loadData = async () => {
            try {
                const [resSppd, resGeo] = await Promise.all([
                    authFetch('/api/sppd'),
                    authFetch('/api/geotagging')
                ]);
                const sppdData = await resSppd.json();
                const geoData = await resGeo.json();

                // Hanya SPD milik user ini yang sudah diterbitkan
                const mySpd = (Array.isArray(sppdData) ? sppdData : []).filter(
                    s => s.status === 'DITERBITKAN' && s.pegawai_id === user.id
                );
                setSppdList(mySpd);
                setHistoryList(Array.isArray(geoData) ? geoData : []);
                setDataLoaded(true);
            } catch (e) {
                console.error('Error loading geotagging data:', e);
                setDataLoaded(true);
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Camera setup
    useEffect(() => {
        let currentVideo = null;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        currentVideo = videoRef.current;
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera: ", err);
                    setErrorMsg("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
                });
        }
        return () => {
            if (currentVideo && currentVideo.srcObject) {
                currentVideo.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const reloadHistory = async () => {
        try {
            const resGeo = await authFetch('/api/geotagging');
            const geoData = await resGeo.json();
            setHistoryList(Array.isArray(geoData) ? geoData : []);
        } catch (e) { console.error(e); }
    };

    const handleGetLocation = () => {
        setIsCheckingIn(true);
        setErrorMsg('');

        if (!navigator.geolocation) {
            setErrorMsg('Geolocation tidak didukung oleh browser Anda');
            setIsCheckingIn(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                if (videoRef.current && canvasRef.current) {
                    const context = canvasRef.current.getContext('2d');
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    setPhoto(canvasRef.current.toDataURL('image/jpeg'));
                }
                setIsCheckingIn(false);
            },
            (error) => {
                setIsCheckingIn(false);
                const msgs = {
                    [error.PERMISSION_DENIED]: "Pengguna menolak permintaan Geolocation.",
                    [error.POSITION_UNAVAILABLE]: "Informasi lokasi tidak tersedia.",
                    [error.TIMEOUT]: "Permintaan timeout."
                };
                setErrorMsg(msgs[error.code] || "Terjadi kesalahan.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSubmitCheckin = async () => {
        if (!location || !photo || !selectedSppdId) {
            alert('Pastikan SPD dipilih dan foto & lokasi sudah diambil!');
            return;
        }
        const selectedSPD = sppdList.find(s => s.id === selectedSppdId);
        if (!selectedSPD) return;

        try {
            const fetchRes = await fetch(photo);
            const blob = await fetchRes.blob();

            const formData = new FormData();
            formData.append('foto', blob, `checkin_${selectedSPD.nomor_spd.replace(/\//g, '_')}.jpg`);
            formData.append('sppd_id', selectedSppdId);
            formData.append('pegawai_id', user?.id || selectedSPD.pegawai_id);
            formData.append('latitude', location.lat);
            formData.append('longitude', location.lng);

            const isEditing = !!editingId;
            const url = isEditing
                ? `/api/geotagging/${editingId}`
                : '/api/geotagging';

            const res = await authFetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'x-st-number': selectedSPD.surat_tugas?.nomor_st || selectedSPD.nomor_spd },
                body: formData
            });

            if (!res.ok) throw new Error('Server error');

            setCheckinData({
                time: new Date().toLocaleString('id-ID'),
                lat: location.lat,
                lng: location.lng,
                status: isEditing ? 'Berhasil Diperbarui' : 'Berhasil Diverifikasi',
                sppd: selectedSPD
            });

            await reloadHistory();
            setEditingId(null);
            alert(isEditing ? 'Data Geotagging Berhasil Diperbarui!' : 'Check-in Berhasil Disimpan!');
        } catch (error) {
            console.error('Error post geotagging:', error);
            alert('Terjadi kesalahan saat menyimpan data.');
        }
    };

    const handleEditCheckin = (item) => {
        setEditingId(item.id);
        setSelectedSppdId(item.sppd_id);
        setLocation({ lat: item.latitude, lng: item.longitude, accuracy: 0 });
        setPhoto(null);
        setCheckinData(null);
        window.scrollTo(0, 0);
    };

    const handleResetForm = () => {
        setCheckinData(null); setPhoto(null); setLocation(null);
        setEditingId(null); setSelectedSppdId('');
    };

    const getSpdLabel = (spd) => {
        const tujuan = spd.tempat_tujuan || '-';
        const tgl = spd.tanggal_berangkat ? new Date(spd.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const stNo = spd.surat_tugas?.nomor_st || '';
        return `${spd.nomor_spd} → ${tujuan} (${tgl})${stNo ? ' | ST: ' + stNo : ''}`;
    };

    return (
        <div className="geotagging-page">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Geotagging & Bukti Kehadiran</h1>
                <p style={{ color: 'var(--text-muted)' }}>Lakukan Check-in di lokasi tujuan sebagai bukti riil perjalanan dinas.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
                {/* Form Check-in */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">{editingId ? '✏️ Edit Check-in' : '📍 Check-in Lokasi'}</h2>
                    </div>
                    <div className="card-body">
                        {!checkinData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Pilih SPD Aktif</label>
                                    <select className="form-control" value={selectedSppdId} onChange={(e) => setSelectedSppdId(e.target.value)}>
                                        <option value="">-- Pilih SPD --</option>
                                        {sppdList.map(spd => (
                                            <option key={spd.id} value={spd.id}>{getSpdLabel(spd)}</option>
                                        ))}
                                    </select>
                                    {dataLoaded && sppdList.length === 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            Tidak ada SPD aktif yang diterbitkan untuk Anda.
                                        </div>
                                    )}
                                </div>

                                {/* Info SPD terpilih */}
                                {selectedSppdId && (() => {
                                    const sel = sppdList.find(s => s.id === selectedSppdId);
                                    if (!sel) return null;
                                    return (
                                        <div style={{ backgroundColor: 'var(--secondary-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                                <div><span style={{ color: 'var(--text-muted)' }}>Nomor SPD:</span> <strong>{sel.nomor_spd}</strong></div>
                                                <div><span style={{ color: 'var(--text-muted)' }}>Tujuan:</span> <strong>{sel.tempat_tujuan}</strong></div>
                                                <div><span style={{ color: 'var(--text-muted)' }}>Berangkat:</span> {new Date(sel.tanggal_berangkat).toLocaleDateString('id-ID')}</div>
                                                <div><span style={{ color: 'var(--text-muted)' }}>Kembali:</span> {new Date(sel.tanggal_kembali).toLocaleDateString('id-ID')}</div>
                                                {sel.surat_tugas?.nomor_st && <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>Surat Tugas:</span> <strong>{sel.surat_tugas.nomor_st}</strong></div>}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '4/3' }}>
                                    {!photo ? (
                                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <img src={photo} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                                </div>

                                {errorMsg && <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-color)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{errorMsg}</div>}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button onClick={handleGetLocation} disabled={isCheckingIn || !selectedSppdId} className="btn btn-primary"
                                        style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', opacity: !selectedSppdId ? 0.5 : 1 }}>
                                        {isCheckingIn ? 'Mendeteksi Lokasi...' : (<><span style={{ fontSize: '1.25rem' }}>📍</span> 1. Ambil Kordinat & Foto</>)}
                                    </button>
                                    <button onClick={handleSubmitCheckin} disabled={!location || !photo} className="btn"
                                        style={{
                                            width: '100%', padding: '0.75rem', fontSize: '1rem',
                                            backgroundColor: (!location || !photo) ? 'var(--border-color)' : 'var(--success-color)',
                                            color: (!location || !photo) ? 'var(--text-muted)' : 'white',
                                            cursor: (!location || !photo) ? 'not-allowed' : 'pointer'
                                        }}>
                                        ✓ 2. {editingId ? 'Perbarui Bukti' : 'Simpan Bukti Kehadiran'}
                                    </button>
                                    {editingId && <button onClick={handleResetForm} className="btn btn-outline" style={{ width: '100%' }}>Batal Edit</button>}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--success-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1rem auto' }}>✓</div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Check-in Berhasil</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Data kehadiran tercatat dengan GPS Geotagging.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', backgroundColor: 'var(--secondary-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '0.875rem' }}><span style={{ fontWeight: 600 }}>Tujuan:</span> {checkinData.sppd?.tempat_tujuan}</div>
                                    <div style={{ fontSize: '0.875rem' }}><span style={{ fontWeight: 600 }}>Waktu:</span> {checkinData.time}</div>
                                    <div style={{ fontSize: '0.875rem' }}><span style={{ fontWeight: 600 }}>Lat:</span> {checkinData.lat}</div>
                                    <div style={{ fontSize: '0.875rem' }}><span style={{ fontWeight: 600 }}>Lng:</span> {checkinData.lng}</div>
                                    <div style={{ fontSize: '0.875rem' }}><span style={{ fontWeight: 600 }}>Status:</span> <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{checkinData.status}</span></div>
                                </div>
                                <button onClick={handleResetForm} className="btn btn-outline" style={{ marginTop: '1.5rem' }}>Check-in Baru</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Peta Lokasi — static map image */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">🗺️ Titik Kordinat</h2>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ width: '100%', minHeight: '400px', backgroundColor: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {location ? (
                                <div style={{ width: '100%', height: '400px', position: 'relative' }}>
                                    <iframe
                                        title="Lokasi Check-in"
                                        width="100%"
                                        height="400"
                                        style={{ border: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.005},${location.lng + 0.01},${location.lat + 0.005}&layer=mapnik&marker=${location.lat},${location.lng}`}
                                    />
                                    <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                                        📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🗺️</div>
                                    <p>Klik <strong>&quot;Ambil Kordinat & Foto&quot;</strong> untuk mendeteksi lokasi.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Riwayat Check-in */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="card-title">📋 Riwayat Check-in Geotagging</h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{historyList.length} data</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {historyList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            {dataLoaded ? 'Belum ada riwayat check-in geotagging.' : 'Memuat data...'}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem' }}>Foto</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem' }}>SPD / Tujuan</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem' }}>Koordinat</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem' }}>Waktu Check-in</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyList.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                {item.foto_bukti_path ? (
                                                    <img src={`${item.foto_bukti_path}`} alt="Bukti"
                                                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '6px', backgroundColor: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📷</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.sppd?.nomor_spd || '-'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.sppd?.tempat_tujuan || '-'}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                                <div>Lat: {item.latitude?.toFixed(6)}</div>
                                                <div>Lng: {item.longitude?.toFixed(6)}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                                {new Date(item.waktu_checkin).toLocaleString('id-ID')}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                                                <button onClick={() => handleEditCheckin(item)} className="btn btn-sm"
                                                    style={{ border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontSize: '0.8rem' }}>
                                                    ✏️ Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
