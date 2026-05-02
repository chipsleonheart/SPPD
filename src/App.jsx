import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataPegawai from './pages/DataPegawai';
import NotaDinas from './pages/NotaDinas';
import SuratTugas from './pages/SuratTugas';
import PembuatanSPD from './pages/PembuatanSPD';
import Pertanggungjawaban from './pages/Pertanggungjawaban';
import Geotagging from './pages/Geotagging';
import LaporanPerjalanan from './pages/LaporanPerjalanan';
import VerifikasiST from './pages/VerifikasiST';
import VerifikasiND from './pages/VerifikasiND';
import VerifikasiSPD from './pages/VerifikasiSPD';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          <Route path="/verifikasi/st/:id" element={<VerifikasiST />} />
          <Route path="/verifikasi/nd/:id" element={<VerifikasiND />} />
          <Route path="/verifikasi/spd/:id" element={<VerifikasiSPD />} />

          {/* Protected routes — semua user yang sudah login */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* ADMIN only */}
            <Route path="pegawai" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DataPegawai />
              </ProtectedRoute>
            } />

            {/* KPA, PPK, ADMIN approval Surat tugas */}
            <Route path="surat-tugas" element={<SuratTugas />} />

            {/* Terbuka bagi semua role yang login (PEGAWAI hanya mencetak, PPK/KPA/ADMIN membuat) */}
            <Route path="spd" element={<PembuatanSPD />} />

            {/* Semua role */}
            <Route path="nota-dinas" element={<NotaDinas />} />
            <Route path="spj" element={<Pertanggungjawaban />} />
            <Route path="laporan" element={<LaporanPerjalanan />} />
            <Route path="geotagging" element={<Geotagging />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
