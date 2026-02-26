import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute – membungkus route yang memerlukan autentikasi.
 * @param {string[]} allowedRoles  - jika diisi, hanya role tsb yang boleh akses
 */
export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, user } = useAuth();

    // Belum login → arahkan ke halaman login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Jika ada role restriction, cek apakah user punya akses
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center'
            }}>
                <div style={{ fontSize: '4rem' }}>🚫</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Akses Ditolak</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                    Halaman ini hanya dapat diakses oleh <strong>{allowedRoles.join(' / ')}</strong>.
                    Role Anda saat ini adalah <strong>{user?.role}</strong>.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="btn btn-outline"
                    style={{ marginTop: '1rem' }}
                >
                    ← Kembali
                </button>
            </div>
        );
    }

    return children;
}
