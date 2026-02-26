import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ALL_MENU = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', roles: null },
    { name: 'Data Pegawai', path: '/pegawai', icon: '👥', roles: ['ADMIN'] },
    { name: 'Nota Dinas', path: '/nota-dinas', icon: '📝', roles: null },
    { name: 'Surat Tugas', path: '/surat-tugas', icon: '📋', roles: null },
    { name: 'Pembuatan SPD', path: '/spd', icon: '📄', roles: null },
    { name: 'SPJ & Biaya', path: '/spj', icon: '💰', roles: null },
    { name: 'Laporan Dinas', path: '/laporan', icon: '🗒️', roles: null },
    { name: 'Check-in (Geo)', path: '/geotagging', icon: '📍', roles: null },
];

export default function Sidebar({ isOpen }) {
    const { user } = useAuth();

    const menuItems = ALL_MENU.filter(item =>
        !item.roles || (user?.role && item.roles.includes(user.role))
    );

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div style={{ width: 32, height: 32, backgroundColor: 'var(--primary-color)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>S</div>
                <h1>e-SPD ASN</h1>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            {/* Session info at bottom */}
            {user && (
                <div style={{
                    margin: '1rem', padding: '0.75rem', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.75rem', color: 'var(--text-muted)'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-main)' }}>
                        {user.nama_lengkap?.split(' ').slice(0, 3).join(' ')}
                    </div>
                    <div>NIP: {user.nip}</div>
                    <div>{user.jabatan}</div>
                </div>
            )}
        </aside>
    );
}
