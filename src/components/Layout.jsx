import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
    ADMIN: { label: 'Administrator', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
    PPK: { label: 'PPK', color: '#0369a1', bg: 'rgba(3,105,161,0.12)' },
    KPA: { label: 'Sekretaris', color: '#065f46', bg: 'rgba(6,95,70,0.12)' },
    KETUA: { label: 'Ketua', color: '#1e3a8a', bg: 'rgba(30,58,138,0.12)' },
    KOMISIONER: { label: 'Komisioner', color: '#b91c1c', bg: 'rgba(185,28,28,0.12)' },
    PEGAWAI: { label: 'Pegawai', color: '#92400e', bg: 'rgba(146,64,14,0.12)' },
};

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Auto close sidebar when route changes on mobile
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsSidebarOpen(false);
    }, [location]);

    const handleLogout = () => {
        if (window.confirm('Yakin ingin keluar dari sistem?')) {
            logout();
            navigate('/login', { replace: true });
        }
    };

    const roleInfo = ROLE_LABEL[user?.role] || ROLE_LABEL.PEGAWAI;
    const initials = user?.nama_lengkap
        ? user.nama_lengkap.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
        : 'A';

    return (
        <div className="app-container">
            {isSidebarOpen && (
                <div className="sidebar-overlay animate-fade-in" onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="main-content">
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <div className="topbar-title">e-SPD ASN</div>
                    </div>
                    <div className="topbar-actions">
                        {/* Role Badge */}
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem',
                            fontWeight: 700, letterSpacing: '0.05em',
                            color: roleInfo.color, backgroundColor: roleInfo.bg,
                            display: window.innerWidth > 640 ? 'inline' : 'none'
                        }}>
                            {roleInfo.label}
                        </span>

                        <div className="user-profile">
                            <div className="avatar" style={{ background: `linear-gradient(135deg, ${roleInfo.color} 0%, ${roleInfo.color}aa 100%)` }}>
                                {initials}
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, display: window.innerWidth > 400 ? 'block' : 'none' }}>
                                {user?.nama_lengkap?.split(' ').slice(0, 2).join(' ') || 'Pengguna'}
                            </span>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            title="Keluar dari Sistem"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.4rem 0.75rem',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '8px', color: 'var(--danger-color)',
                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            <span style={{ display: window.innerWidth > 480 ? 'inline' : 'none' }}>Keluar</span>
                        </button>
                    </div>
                </header>

                <main className="page-container animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
