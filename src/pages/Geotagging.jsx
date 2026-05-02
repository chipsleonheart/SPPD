import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Geotagging() {
    const { authFetch, user } = useAuth();
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [gpsStatus, setGpsStatus] = useState('idle'); // idle, detecting, success, error
    const [photo, setPhoto] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [checkinData, setCheckinData] = useState(null);
    const [sppdList, setSppdList] = useState([]);
    const [selectedSppdId, setSelectedSppdId] = useState('');
    const [historyList, setHistoryList] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1); // 1: pilih SPD, 2: kamera, 3: lokasi (auto), 4: konfirmasi, 5: success

    // Camera state
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraSupported, setCameraSupported] = useState(true);
    const [facingMode, setFacingMode] = useState('environment'); // environment = rear, user = front
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    // Check camera support
    useEffect(() => {
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        setCameraSupported(hasGetUserMedia);
    }, []);

    // Start GPS detection early (as soon as SPD is selected)
    const startGpsDetection = useCallback(() => {
        if (location || gpsStatus === 'detecting') return;
        setGpsStatus('detecting');
        setErrorMsg('');

        if (!navigator.geolocation) {
            setErrorMsg('Geolocation tidak didukung oleh browser Anda');
            setGpsStatus('error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setGpsStatus('success');
            },
            (error) => {
                setGpsStatus('error');
                const msgs = {
                    [error.PERMISSION_DENIED]: "Izinkan akses lokasi di pengaturan browser Anda.",
                    [error.POSITION_UNAVAILABLE]: "Lokasi tidak tersedia. Pastikan GPS aktif.",
                    [error.TIMEOUT]: "Timeout mendeteksi lokasi. Coba lagi."
                };
                setErrorMsg(msgs[error.code] || "Terjadi kesalahan.");
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, [location, gpsStatus]);

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

    // Start camera when entering step 2
    useEffect(() => {
        if (step === 2 && cameraSupported && !photo) {
            startCamera();
        }
        if (step !== 2) {
            stopCamera();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, facingMode]);

    // Start GPS when entering step 2 (parallel with camera)
    useEffect(() => {
        if (step === 2 && !location) {
            startGpsDetection();
        }
    }, [step, location, startGpsDetection]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    const reloadHistory = async () => {
        try {
            const resGeo = await authFetch('/api/geotagging');
            const geoData = await resGeo.json();
            setHistoryList(Array.isArray(geoData) ? geoData : []);
        } catch (e) { console.error(e); }
    };

    // Camera functions
    const startCamera = async () => {
        stopCamera();
        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 960 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setCameraActive(true);
        } catch (err) {
            console.error('Camera error:', err);
            setCameraActive(false);
            if (err.name === 'NotAllowedError') {
                setErrorMsg('Izin kamera ditolak. Aktifkan di pengaturan browser.');
            } else if (err.name === 'NotFoundError') {
                setErrorMsg('Kamera tidak ditemukan.');
                setCameraSupported(false);
            } else {
                setCameraSupported(false);
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        // Flip for front camera
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `checkin_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPhotoFile(file);
            const url = URL.createObjectURL(blob);
            setPhoto(url);
            stopCamera();

            // If GPS already detected, go to confirmation
            if (location) {
                setStep(4);
            } else {
                setStep(3); // Wait for GPS
            }
        }, 'image/jpeg', 0.85);
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    // Fallback file input
    const handlePhotoCapture = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPhoto(ev.target.result);
            if (location) {
                setStep(4);
            } else {
                setStep(3);
            }
        };
        reader.readAsDataURL(file);
    };

    // Auto-advance from GPS step when location arrives
    useEffect(() => {
        if (step === 3 && location && photo) {
            const timer = setTimeout(() => setStep(4), 600);
            return () => clearTimeout(timer);
        }
    }, [step, location, photo]);

    const handleRetryGps = () => {
        setLocation(null);
        setGpsStatus('idle');
        setErrorMsg('');
        setTimeout(() => startGpsDetection(), 100);
    };

    const handleSubmitCheckin = async () => {
        if (!location || !photoFile || !selectedSppdId) {
            alert('Pastikan SPD dipilih, foto diambil, dan lokasi terdeteksi!');
            return;
        }
        const selectedSPD = sppdList.find(s => s.id === selectedSppdId);
        if (!selectedSPD) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('foto', photoFile, `checkin_${selectedSPD.nomor_spd.replace(/\//g, '_')}.jpg`);
            formData.append('sppd_id', selectedSppdId);
            formData.append('pegawai_id', user?.id || selectedSPD.pegawai_id);
            formData.append('latitude', location.lat);
            formData.append('longitude', location.lng);

            const isEditing = !!editingId;
            const url = isEditing ? `/api/geotagging/${editingId}` : '/api/geotagging';

            const res = await authFetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'x-st-number': selectedSPD.surat_tugas?.nomor_st || selectedSPD.nomor_spd },
                body: formData
            });

            if (!res.ok) throw new Error('Server error');

            // Haptic on success
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            setCheckinData({
                time: new Date().toLocaleString('id-ID'),
                lat: location.lat,
                lng: location.lng,
                status: isEditing ? 'Berhasil Diperbarui' : 'Berhasil Diverifikasi',
                sppd: selectedSPD
            });

            await reloadHistory();
            setEditingId(null);
            setStep(5); // success
        } catch (error) {
            console.error('Error post geotagging:', error);
            alert('Terjadi kesalahan saat menyimpan data.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCheckin = (item) => {
        setEditingId(item.id);
        setSelectedSppdId(item.sppd_id);
        setLocation(null);
        setGpsStatus('idle');
        setPhoto(null);
        setPhotoFile(null);
        setCheckinData(null);
        setStep(2); // start from camera
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleResetForm = () => {
        setCheckinData(null);
        setPhoto(null);
        setPhotoFile(null);
        setLocation(null);
        setGpsStatus('idle');
        setEditingId(null);
        setSelectedSppdId('');
        setErrorMsg('');
        setStep(1);
        stopCamera();
    };

    const getSpdLabel = (spd) => {
        const tujuan = spd.tempat_tujuan || '-';
        const tgl = spd.tanggal_berangkat ? new Date(spd.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        return `${spd.nomor_spd} → ${tujuan} (${tgl})`;
    };

    const selectedSPD = sppdList.find(s => s.id === selectedSppdId);

    // GPS status badge (shown floating during camera)
    const renderGpsBadge = () => {
        const configs = {
            idle: { bg: 'var(--border-color)', text: 'var(--text-muted)', icon: '📍', label: 'GPS Idle' },
            detecting: { bg: '#fef3c7', text: '#92400e', icon: '🔄', label: 'Mendeteksi GPS...' },
            success: { bg: '#d1fae5', text: '#065f46', icon: '✓', label: `GPS OK (±${Math.round(location?.accuracy || 0)}m)` },
            error: { bg: '#fee2e2', text: '#991b1b', icon: '⚠', label: 'GPS Error' }
        };
        const c = configs[gpsStatus] || configs.idle;
        return (
            <div className="geo-gps-badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', borderRadius: '2rem',
                backgroundColor: c.bg, color: c.text,
                fontSize: '0.75rem', fontWeight: 600,
                animation: gpsStatus === 'detecting' ? 'pulse-badge 1.5s ease-in-out infinite' : 'none'
            }}>
                <span style={{ fontSize: '0.85rem' }}>{c.icon}</span> {c.label}
            </div>
        );
    };

    // Step indicator (compact version)
    const renderStepIndicator = () => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginBottom: '1.25rem' }}>
            {[1, 2, 3, 4].map(s => (
                <div key={s} style={{
                    width: step === s ? '2rem' : '0.5rem',
                    height: '0.35rem',
                    borderRadius: '0.25rem',
                    backgroundColor: step >= s ? 'var(--primary-color)' : 'var(--border-color)',
                    transition: 'all 0.3s ease'
                }} />
            ))}
        </div>
    );

    return (
        <div className="geotagging-page">
            {/* Hidden elements */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                style={{ display: 'none' }}
            />

            <div style={{ marginBottom: '1.25rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>📍 Check-in Kehadiran</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bukti kehadiran di lokasi tujuan perjalanan dinas.</p>
            </div>

            {/* Main Check-in Card */}
            <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
                {step !== 2 && (
                    <div className="card-header">
                        <h2 className="card-title">{editingId ? '✏️ Edit Check-in' : '📷 Check-in Baru'}</h2>
                    </div>
                )}
                <div className="card-body" style={step === 2 ? { padding: 0 } : undefined}>
                    {step <= 4 && step !== 5 && step !== 2 && renderStepIndicator()}

                    {/* STEP 1: Pilih SPD */}
                    {step === 1 && (
                        <div className="geo-step-content animate-fade-in">
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Pilih SPD Perjalanan Dinas</label>

                                {/* Mobile-friendly SPD cards instead of select dropdown */}
                                {sppdList.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {sppdList.map(spd => (
                                            <div
                                                key={spd.id}
                                                onClick={() => setSelectedSppdId(spd.id)}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    border: `2px solid ${selectedSppdId === spd.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                    backgroundColor: selectedSppdId === spd.id ? 'rgba(37, 99, 235, 0.05)' : 'var(--surface-color)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative'
                                                }}
                                            >
                                                {selectedSppdId === spd.id && (
                                                    <div style={{
                                                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        backgroundColor: 'var(--primary-color)', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', fontWeight: 700
                                                    }}>✓</div>
                                                )}
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--primary-color)', paddingRight: '2rem' }}>
                                                    {spd.nomor_spd}
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                    <span>📍 {spd.tempat_tujuan || '-'}</span>
                                                    <span>📅 {spd.tanggal_berangkat ? new Date(spd.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : dataLoaded ? (
                                    <div style={{
                                        padding: '2rem 1rem', textAlign: 'center',
                                        backgroundColor: 'var(--secondary-color)', borderRadius: '12px',
                                        color: 'var(--text-muted)', fontSize: '0.9rem'
                                    }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📋</div>
                                        Tidak ada SPD aktif yang diterbitkan untuk Anda.
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
                                )}
                            </div>

                            <button onClick={() => setStep(2)} disabled={!selectedSppdId} className="btn btn-primary geo-btn-main"
                                style={{ opacity: !selectedSppdId ? 0.5 : 1 }}>
                                📷 Lanjut Ambil Foto
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Live Camera */}
                    {step === 2 && (
                        <div className="geo-camera-container animate-fade-in">
                            {/* GPS badge overlay */}
                            <div style={{
                                position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 3
                            }}>
                                {renderGpsBadge()}
                            </div>

                            {cameraSupported && cameraActive ? (
                                <>
                                    {/* Live video */}
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                                        }}
                                    />

                                    {/* Camera controls overlay */}
                                    <div className="geo-camera-controls">
                                        {/* Back button */}
                                        <button
                                            onClick={() => { stopCamera(); setStep(1); }}
                                            className="geo-cam-btn"
                                            aria-label="Kembali"
                                        >
                                            ←
                                        </button>

                                        {/* Capture button */}
                                        <button
                                            onClick={capturePhoto}
                                            className="geo-capture-btn"
                                            aria-label="Ambil Foto"
                                        >
                                            <div className="geo-capture-btn-inner" />
                                        </button>

                                        {/* Switch camera */}
                                        <button
                                            onClick={switchCamera}
                                            className="geo-cam-btn"
                                            aria-label="Ganti Kamera"
                                        >
                                            🔄
                                        </button>
                                    </div>

                                    {/* Viewfinder corners */}
                                    <div className="geo-viewfinder">
                                        <div className="geo-vf-corner geo-vf-tl" />
                                        <div className="geo-vf-corner geo-vf-tr" />
                                        <div className="geo-vf-corner geo-vf-bl" />
                                        <div className="geo-vf-corner geo-vf-br" />
                                    </div>
                                </>
                            ) : (
                                /* Fallback: file input for unsupported browsers */
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center',
                                    backgroundColor: 'var(--secondary-color)'
                                }}>
                                    {errorMsg && (
                                        <div style={{
                                            padding: '0.75rem 1rem', backgroundColor: '#fef2f2',
                                            border: '1px solid #fecaca', borderRadius: '10px',
                                            color: '#dc2626', marginBottom: '1.5rem', fontSize: '0.85rem',
                                            width: '100%', maxWidth: '320px'
                                        }}>
                                            ⚠️ {errorMsg}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📸</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        {cameraSupported ? 'Kamera tidak dapat diakses' : 'Browser tidak mendukung live camera'}
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                        Gunakan tombol di bawah untuk mengambil foto
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn btn-primary"
                                        style={{ padding: '0.9rem 2rem', fontSize: '1rem', borderRadius: '12px' }}
                                    >
                                        📷 Buka Kamera / Galeri
                                    </button>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="btn btn-outline"
                                        style={{ marginTop: '0.75rem', padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
                                    >
                                        ← Kembali
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Waiting for GPS (auto-advance) */}
                    {step === 3 && (
                        <div className="geo-step-content animate-fade-in" style={{ textAlign: 'center' }}>
                            {renderStepIndicator()}

                            {/* Show photo thumbnail */}
                            {photo && (
                                <div style={{
                                    width: '120px', height: '120px', borderRadius: '16px',
                                    overflow: 'hidden', margin: '0 auto 1.5rem auto',
                                    border: '3px solid var(--success-color)', boxShadow: 'var(--shadow-md)'
                                }}>
                                    <img src={photo} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}

                            {gpsStatus === 'detecting' && (
                                <div style={{ padding: '1rem 0' }}>
                                    <div className="geo-gps-spinner" />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: '1.5rem' }}>
                                        Mendeteksi Lokasi GPS...
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        Pastikan GPS perangkat Anda aktif.
                                    </p>
                                </div>
                            )}

                            {gpsStatus === 'success' && (
                                <div style={{ padding: '1rem 0' }}>
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '50%',
                                        backgroundColor: 'var(--success-color)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.5rem', margin: '0 auto 1rem auto'
                                    }}>✓</div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Lokasi Terdeteksi!</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Melanjutkan ke konfirmasi...</p>
                                </div>
                            )}

                            {gpsStatus === 'error' && (
                                <div style={{ padding: '1rem 0' }}>
                                    <div style={{
                                        padding: '0.75rem 1rem', backgroundColor: '#fef2f2',
                                        border: '1px solid #fecaca', borderRadius: '10px',
                                        color: '#dc2626', marginBottom: '1.5rem', fontSize: '0.85rem'
                                    }}>
                                        ⚠️ {errorMsg}
                                    </div>
                                    <button onClick={handleRetryGps} className="btn btn-primary geo-btn-main">
                                        📍 Coba Lagi Deteksi GPS
                                    </button>
                                </div>
                            )}

                            <button onClick={() => { setPhoto(null); setPhotoFile(null); setStep(2); }}
                                className="btn btn-outline" style={{ width: '100%', marginTop: '1rem', padding: '0.6rem' }}>
                                ← Foto Ulang
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Konfirmasi & Kirim */}
                    {step === 4 && (
                        <div className="geo-step-content animate-fade-in">
                            {renderStepIndicator()}
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                                Konfirmasi Data Check-in
                            </h3>

                            {/* Photo + Info in mobile-friendly layout */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '120px 1fr',
                                gap: '1rem', marginBottom: '1.25rem'
                            }}>
                                {photo && (
                                    <div style={{
                                        borderRadius: '12px', overflow: 'hidden',
                                        border: '2px solid var(--success-color)', aspectRatio: '3/4'
                                    }}>
                                        <img src={photo} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <div className="geo-info-row">
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SPD</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{selectedSPD?.nomor_spd}</div>
                                    </div>
                                    <div className="geo-info-row">
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tujuan</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{selectedSPD?.tempat_tujuan}</div>
                                    </div>
                                    <div className="geo-info-row">
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GPS</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>📍 {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</div>
                                    </div>
                                    <div className="geo-info-row">
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waktu</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{new Date().toLocaleString('id-ID')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Map preview */}
                            {location && (
                                <div style={{
                                    width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden',
                                    marginBottom: '1.25rem', border: '1px solid var(--border-color)'
                                }}>
                                    <iframe
                                        title="Lokasi Check-in"
                                        width="100%" height="160" style={{ border: 0 }}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.005},${location.lat - 0.003},${location.lng + 0.005},${location.lat + 0.003}&layer=mapnik&marker=${location.lat},${location.lng}`}
                                    />
                                </div>
                            )}

                            <button onClick={handleSubmitCheckin} disabled={isSubmitting} className="btn geo-btn-submit"
                                style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? (
                                    <><span className="geo-btn-spinner" /> Mengirim...</>
                                ) : (
                                    <>✓ {editingId ? 'Perbarui Bukti' : 'Kirim Bukti Kehadiran'}</>
                                )}
                            </button>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                <button onClick={() => { setPhoto(null); setPhotoFile(null); setStep(2); }}
                                    className="btn btn-outline" style={{ flex: 1, padding: '0.6rem' }}>
                                    📷 Foto Ulang
                                </button>
                                <button onClick={() => setStep(1)}
                                    className="btn btn-outline" style={{ flex: 1, padding: '0.6rem' }}>
                                    ← Ganti SPD
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Success */}
                    {step === 5 && checkinData && (
                        <div className="geo-step-content animate-fade-in" style={{ textAlign: 'center' }}>
                            <div className="geo-success-icon">✓</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check-in Berhasil!</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Data kehadiran tercatat dengan GPS Geotagging.</p>

                            <div style={{
                                textAlign: 'left', backgroundColor: 'var(--secondary-color)',
                                padding: '1rem', borderRadius: '12px', fontSize: '0.85rem',
                                display: 'flex', flexDirection: 'column', gap: '0.4rem'
                            }}>
                                <div><span style={{ fontWeight: 600 }}>Tujuan:</span> {checkinData.sppd?.tempat_tujuan}</div>
                                <div><span style={{ fontWeight: 600 }}>Waktu:</span> {checkinData.time}</div>
                                <div><span style={{ fontWeight: 600 }}>Koordinat:</span> {checkinData.lat.toFixed(6)}, {checkinData.lng.toFixed(6)}</div>
                                <div><span style={{ fontWeight: 600 }}>Status:</span> <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{checkinData.status}</span></div>
                            </div>

                            <button onClick={handleResetForm} className="btn btn-primary geo-btn-main" style={{ marginTop: '1.5rem' }}>
                                + Check-in Baru
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Riwayat Check-in */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="card-title">📋 Riwayat Check-in</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'var(--secondary-color)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>{historyList.length}</span>
                </div>
                <div className="card-body" style={{ padding: historyList.length === 0 ? undefined : 0 }}>
                    {historyList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                            {dataLoaded ? (
                                <>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.4 }}>📍</div>
                                    <p>Belum ada riwayat check-in.</p>
                                </>
                            ) : 'Memuat data...'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {historyList.map((item, idx) => (
                                <div key={item.id} className="geo-history-item" style={{
                                    borderBottom: idx < historyList.length - 1 ? '1px solid var(--border-color)' : 'none'
                                }}>
                                    {/* Foto thumbnail */}
                                    <div style={{ flexShrink: 0 }}>
                                        {item.foto_bukti_path ? (
                                            <img src={`${item.foto_bukti_path}`} alt="Bukti"
                                                style={{
                                                    width: '56px', height: '56px', objectFit: 'cover',
                                                    borderRadius: '10px', border: '1px solid var(--border-color)'
                                                }}
                                                crossOrigin="anonymous"
                                            />
                                        ) : (
                                            <div style={{
                                                width: '56px', height: '56px', borderRadius: '10px',
                                                backgroundColor: 'var(--secondary-color)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                                            }}>📷</div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.sppd?.nomor_spd || '-'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            {item.sppd?.tempat_tujuan || '-'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                            📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)} · {new Date(item.waktu_checkin).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    {/* Edit button */}
                                    <button onClick={() => handleEditCheckin(item)} className="geo-edit-btn" aria-label="Edit">
                                        ✏️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
