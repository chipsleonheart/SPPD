import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_COLORS = {
    ADMIN: { bg: '#7c3aed', label: 'Administrator' },
    PPK: { bg: '#0369a1', label: 'Pejabat Pembuat Komitmen' },
    KPA: { bg: '#065f46', label: 'Sekretaris (KPA)' },
    KETUA: { bg: '#1e3a8a', label: 'Ketua' },
    KOMISIONER: { bg: '#b91c1c', label: 'Komisioner' },
    PEGAWAI: { bg: '#92400e', label: 'Pegawai ASN' },
};

export default function Login() {
    const [nip, setNip] = useState('');
    const [password, setPassword] = useState('');
    const [showPass] = useState(false);
    const [shake, setShake] = useState(false);
    const { login, isLoading, error, setError, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (error) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShake(true);
            const t = setTimeout(() => setShake(false), 600);
            return () => clearTimeout(t);
        }
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const success = await login(nip, password);
        if (success) navigate('/dashboard', { replace: true });
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                .login-card { animation: fadeUp 0.5s ease forwards; }
                .login-card.shake { animation: shake 0.5s ease; }
                .login-input { 
                    width: 100%; padding: 0.875rem 1rem; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.06); color: #f1f5f9; font-size: 0.95rem;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
                }
                .login-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
                .login-input::placeholder { color: rgba(255,255,255,0.3); }
                .login-btn {
                    width: 100%; padding: 0.9rem; border-radius: 10px; border: none; cursor: pointer;
                    font-size: 1rem; font-weight: 600; letter-spacing: 0.025em;
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: white; transition: all 0.2s; margin-top: 0.5rem;
                }
                .login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
                .login-btn:active:not(:disabled) { transform: translateY(0); }
                .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>

            <div className={`login-card ${shake ? 'shake' : ''}`} style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '68px', height: '68px', borderRadius: '16px', margin: '0 auto 1rem',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.75rem', boxShadow: '0 8px 24px rgba(37,99,235,0.4)'
                    }}>✈️</div>
                    <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>SPPD ASN</h1>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginTop: '0.35rem' }}>Portal Login Sistem</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>NIP</label>
                        <input type="text" className="login-input" value={nip} onChange={e => setNip(e.target.value)} required placeholder="Username Anda" />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>PASSWORD</label>
                        <input type={showPass ? 'text' : 'password'} className="login-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password Anda" />
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px', color: '#fca5a5', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? 'Memverifikasi...' : '🔐 Masuk'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>AKUN DEMO</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {[
                            { label: 'Admin', nip: '000000000000000001', pass: 'admin123', color: '#7c3aed' },
                            { label: 'PPK', nip: '197001012000011001', pass: 'ppk12345', color: '#0369a1' },
                            { label: 'Sekretaris', nip: '196505051990031002', pass: 'kpa12345', color: '#065f46' },
                            { label: 'Ketua', nip: '197005051995031001', pass: 'ketua123', color: '#1e3a8a' },
                            { label: 'Komisioner', nip: '197508082000032001', pass: 'komisioner123', color: '#b91c1c' },
                            { label: 'Pegawai', nip: '198001012005011001', pass: 'pegawai123', color: '#92400e' },
                        ].map(d => (
                            <div key={d.label} onClick={() => { setNip(d.nip); setPassword(d.pass); setError(''); }} style={{
                                padding: '0.5rem', borderRadius: '8px', background: `${d.color}22`, border: `1px solid ${d.color}44`,
                                cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8'
                            }}>
                                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{d.label}</div>
                                <div style={{ opacity: 0.6 }}>{d.pass}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
