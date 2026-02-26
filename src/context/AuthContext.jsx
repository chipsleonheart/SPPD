import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sppd_auth_token';
const USER_KEY = 'sppd_user_data';

// Helper: decode JWT payload tanpa verify (untuk cek expiry di client)
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function isTokenExpired(token) {
    const payload = parseJwt(token);
    if (!payload) return true;
    // exp adalah unix timestamp (seconds), Date.now() adalah ms
    return payload.exp * 1000 < Date.now();
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem(USER_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });
    const [token, setToken] = useState(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        // Auto-clear expired token saat init
        if (storedToken && isTokenExpired(storedToken)) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return null;
        }
        return storedToken;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-logout saat token expire (check interval 60 detik)
    useEffect(() => {
        if (!token) return;
        const check = setInterval(() => {
            if (isTokenExpired(token)) {
                logout();
            }
        }, 60000);
        return () => clearInterval(check);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const login = useCallback(async (nip, password) => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nip, password })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Login gagal. Coba lagi.');
                return false;
            }
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return true;
        } catch {
            setError('Tidak dapat terhubung ke server. Pastikan server backend berjalan.');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    // Fungsi helper untuk menambahkan Authorization header ke fetch
    const authFetch = useCallback((url, options = {}) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
    }, [token]);

    const value = {
        user,
        token,
        isLoading,
        error,
        setError,
        login,
        logout,
        authFetch,
        isAuthenticated: !!token && !isTokenExpired(token),
        isAdmin: user?.role === 'ADMIN',
        isPPK: user?.role === 'PPK' || user?.role === 'ADMIN',
        isKPA: user?.role === 'KPA' || user?.role === 'ADMIN', // Sekretaris
        isSekretaris: user?.role === 'KPA' || user?.role === 'ADMIN',
        isKetua: user?.role === 'KETUA' || user?.role === 'ADMIN',
        isKomisioner: user?.role === 'KOMISIONER' || user?.role === 'ADMIN',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
