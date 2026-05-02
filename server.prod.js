/* global process */
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 'sppd_fallback_secret_change_me';
const JWT_EXPIRES = '8h';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan folder uploads tersedia
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'dist')));

// Setup Upload menggunakan Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Cek apakah frontend mengirimkan nomor ST via header
        let stNumber = req.headers['x-st-number'];
        if (!stNumber) {
            stNumber = 'Lainnya';
        }

        // Membersihkan karakter yang tidak valid untuk nama folder windows/linux
        const safeFolderName = stNumber.replace(/[/\\]/g, '_').trim();
        const dir = path.join(UPLOADS_DIR, safeFolderName);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage });

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'SPPD API Server beroperasi 🚀' });
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
        req.user = user;
        next();
    });
};

// --- API ROUTES (Copied from previous reading) ---
// Note: Keeping all existing routes for brevity

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    const { nip, password } = req.body;
    if (!nip || !password) return res.status(400).json({ error: 'NIP dan password wajib diisi.' });

    try {
        const user = await prisma.user.findUnique({ where: { nip } });
        if (!user) return res.status(401).json({ error: 'NIP tidak ditemukan.' });

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ error: 'Password salah.' });

        const payload = { id: user.id, nip: user.nip, nama: user.nama_lengkap, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        const { password_hash, ...userSafe } = user;
        res.json({ token, user: userSafe });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
        const { password_hash, ...userSafe } = user;
        res.json(userSafe);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/seed', async (req, res) => {
    const SALT = 12;
    const demoUsers = [
        { nip: '000000000000000001', nama_lengkap: 'Administrator SPPD', pangkat_golongan: 'Pembina Utama / IV/e', jabatan: 'Administrator Sistem', role: 'ADMIN', password: 'admin123' },
        { nip: '197001012000011001', nama_lengkap: 'Dr. Ahmad Santoso, S.E., M.M.', pangkat_golongan: 'Pembina / IV/a', jabatan: 'Pejabat Pembuat Komitmen (PPK)', role: 'PPK', password: 'ppk12345' },
        { nip: '196505051990031002', nama_lengkap: 'Drs. Bambang Wicaksono, M.Si.', pangkat_golongan: 'Pembina Utama Madya / IV/d', jabatan: 'Sekretaris (KPA)', role: 'KPA', password: 'kpa12345' },
        { nip: '197005051995031001', nama_lengkap: 'H. Suryadi, M.Si.', pangkat_golongan: 'Pembina Utama / IV/e', jabatan: 'Ketua', role: 'KETUA', password: 'ketua123' },
        { nip: '197508082000032001', nama_lengkap: 'Hj. Fatimah, S.E.', pangkat_golongan: 'Pembina / IV/a', jabatan: 'Komisioner', role: 'KOMISIONER', password: 'komisioner123' },
        { nip: '198001012005011001', nama_lengkap: 'Budi Santoso, S.Kom, M.T.', pangkat_golongan: 'Penata / III/c', jabatan: 'Analis Sistem Informasi', role: 'PEGAWAI', password: 'pegawai123' },
    ];
    try {
        const results = [];
        for (const u of demoUsers) {
            const password_hash = await bcrypt.hash(u.password, SALT);
            await prisma.user.upsert({
                where: { nip: u.nip },
                update: { password_hash, nama_lengkap: u.nama_lengkap, pangkat_golongan: u.pangkat_golongan, jabatan: u.jabatan, role: u.role },
                create: { nip: u.nip, nama_lengkap: u.nama_lengkap, pangkat_golongan: u.pangkat_golongan, jabatan: u.jabatan, role: u.role, password_hash }
            });
            results.push({ nip: u.nip, role: u.role, nama: u.nama_lengkap });
        }
        res.json({ message: 'Seeding berhasil!', users: results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/pegawai', async (req, res) => {
    try {
        const pegawai = await prisma.user.findMany({
            orderBy: { created_at: 'desc' },
            select: { id: true, nip: true, nama_lengkap: true, pangkat_golongan: true, jabatan: true, role: true, created_at: true, updated_at: true }
        });
        res.json(pegawai);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/pegawai', async (req, res) => {
    try {
        const { nip, nama_lengkap, pangkat_golongan, jabatan, role, password } = req.body;
        const rawPw = password || 'ganti_password_123';
        const password_hash = await bcrypt.hash(rawPw, 12);
        const newPegawai = await prisma.user.create({
            data: { nip, nama_lengkap, pangkat_golongan, jabatan, role: role || 'PEGAWAI', password_hash },
            select: { id: true, nip: true, nama_lengkap: true, pangkat_golongan: true, jabatan: true, role: true, created_at: true }
        });
        res.json(newPegawai);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/pegawai/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nip, nama_lengkap, pangkat_golongan, jabatan, role, password } = req.body;
        const data = { nip, nama_lengkap, pangkat_golongan, jabatan, role };
        if (password) data.password_hash = await bcrypt.hash(password, 12);
        const updatedPegawai = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, nip: true, nama_lengkap: true, pangkat_golongan: true, jabatan: true, role: true }
        });
        res.json(updatedPegawai);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/pegawai/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'Pegawai dihapus' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/nota-dinas', authenticateToken, async (req, res) => {
    try {
        let where = {};
        if (req.user?.role === 'PEGAWAI' || req.user?.role === 'KOMISIONER') {
            where = {
                OR: [
                    { pengusul_id: req.user.id },
                    { pegawai_ditugaskan: { contains: req.user.nama } }
                ]
            };
        }
        const data = await prisma.notaDinas.findMany({
            where,
            include: { pengusul: { select: { id: true, nip: true, nama_lengkap: true, jabatan: true, role: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/nota-dinas', authenticateToken, async (req, res) => {
    try {
        const { nomor_nd, tanggal_nd, perihal, tujuan, maksud, dasar, pegawai_ditugaskan, pengusul_id } = req.body;
        let uid = pengusul_id || req.user?.id;
        const data = await prisma.notaDinas.create({
            data: { nomor_nd, tanggal_nd: new Date(tanggal_nd), perihal, tujuan, maksud, dasar, pegawai_ditugaskan, pengusul_id: uid, status: 'DIAJUKAN' }
        });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/nota-dinas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nomor_nd, tanggal_nd, perihal, tujuan, maksud, dasar, pegawai_ditugaskan } = req.body;
        const updated = await prisma.notaDinas.update({
            where: { id },
            data: { nomor_nd, tanggal_nd: new Date(tanggal_nd), perihal, tujuan, maksud, dasar, pegawai_ditugaskan }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/nota-dinas/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await prisma.notaDinas.update({ where: { id }, data: { status } });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/surat-tugas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await prisma.suratTugas.findUnique({
            where: { id },
            include: {
                nota_dinas: { include: { pengusul: true } },
                pegawai: { include: { pegawai: true } }
            }
        });
        if (!data) return res.status(404).json({ error: 'Surat Tugas tidak ditemukan' });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/surat-tugas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await prisma.suratTugas.findUnique({
            where: { id },
            include: {
                nota_dinas: { include: { pengusul: true } },
                pegawai: { include: { pegawai: true } }
            }
        });
        if (!data) return res.status(404).json({ error: 'Surat Tugas tidak ditemukan' });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/nota-dinas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await prisma.notaDinas.findUnique({
            where: { id },
            include: {
                pengusul: { select: { id: true, nip: true, nama_lengkap: true, jabatan: true, role: true } }
            }
        });
        if (!data) return res.status(404).json({ error: 'Nota Dinas tidak ditemukan' });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/sppd/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await prisma.sppd.findUnique({
            where: { id },
            include: {
                surat_tugas: { include: { nota_dinas: true } },
                pegawai: { select: { id: true, nip: true, nama_lengkap: true, pangkat_golongan: true, jabatan: true } }
            }
        });
        if (!data) return res.status(404).json({ error: 'SPPD tidak ditemukan' });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/surat-tugas', authenticateToken, async (req, res) => {
    try {
        let where = {};
        if (req.user?.role === 'PEGAWAI' || req.user?.role === 'KOMISIONER') {
            where = {
                OR: [
                    { nota_dinas: { pengusul_id: req.user.id } },
                    { nota_dinas: { pegawai_ditugaskan: { contains: req.user.nama } } },
                    { pegawai: { some: { pegawai_id: req.user.id } } }
                ]
            };
        }
        const data = await prisma.suratTugas.findMany({
            where,
            include: {
                nota_dinas: { include: { pengusul: true } },
                pegawai: { include: { pegawai: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/surat-tugas', authenticateToken, async (req, res) => {
    try {
        const { nota_dinas_id, nomor_st, tanggal_st, menimbang, dasar, untuk, status_persetujuan } = req.body;
        const st = await prisma.suratTugas.create({
            data: { nota_dinas_id, nomor_st, tanggal_st: new Date(tanggal_st), menimbang, dasar, untuk, status_persetujuan: status_persetujuan || 'MENUNGGU_PPK' }
        });
        res.json(st);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/surat-tugas-pegawai', authenticateToken, async (req, res) => {
    try {
        const { surat_tugas_id, pegawai_id } = req.body;
        const data = await prisma.suratTugasPegawai.create({ data: { surat_tugas_id, pegawai_id } });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/surat-tugas/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await prisma.suratTugas.update({ where: { id }, data: { status_persetujuan: status } });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sppd', authenticateToken, async (req, res) => {
    try {
        let where = {};
        if (req.user?.role === 'PEGAWAI') {
            where = { OR: [{ pegawai_id: req.user.id }, { surat_tugas: { nota_dinas: { pegawai_ditugaskan: { contains: req.user.nama } } } }] };
        }
        const data = await prisma.sppd.findMany({ where, include: { surat_tugas: true, pegawai: true }, orderBy: { created_at: 'desc' } });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sppd', authenticateToken, async (req, res) => {
    try {
        const { surat_tugas_id, pegawai_id, nomor_spd, tingkat_biaya, alat_angkutan, tempat_berangkat, tempat_tujuan, tanggal_berangkat, tanggal_kembali, instansi_pembebanan, mata_anggaran } = req.body;
        const sppd = await prisma.sppd.create({
            data: {
                surat_tugas_id, pegawai_id: pegawai_id || req.user.id, nomor_spd, tingkat_biaya, alat_angkutan, tempat_berangkat, tempat_tujuan,
                tanggal_berangkat: new Date(tanggal_berangkat), tanggal_kembali: new Date(tanggal_kembali), instansi_pembebanan, mata_anggaran, status: 'DITERBITKAN'
            }
        });
        res.json(sppd);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/sppd/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nomor_spd, tingkat_biaya, alat_angkutan, tempat_berangkat, tempat_tujuan, tanggal_berangkat, tanggal_kembali, instansi_pembebanan, mata_anggaran } = req.body;
        const sppd = await prisma.sppd.update({
            where: { id },
            data: { nomor_spd, tingkat_biaya, alat_angkutan, tempat_berangkat, tempat_tujuan, tanggal_berangkat: new Date(tanggal_berangkat), tanggal_kembali: new Date(tanggal_kembali), instansi_pembebanan, mata_anggaran }
        });
        res.json(sppd);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/geotagging', authenticateToken, async (req, res) => {
    try {
        const data = await prisma.geotaggingCheckin.findMany({ where: { pegawai_id: req.user.id }, include: { sppd: true, pegawai: true }, orderBy: { waktu_checkin: 'desc' } });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/geotagging', authenticateToken, upload.single('foto'), async (req, res) => {
    try {
        const { sppd_id, pegawai_id, latitude, longitude } = req.body;
        let stNumber = req.headers['x-st-number'] || 'Lainnya';
        const safeFolderName = stNumber.replace(/[/\\]/g, '_').trim();
        const file_path = req.file ? `/uploads/${safeFolderName}/${req.file.filename}` : '';
        const checkin = await prisma.geotaggingCheckin.create({ data: { sppd_id, pegawai_id, latitude: parseFloat(latitude), longitude: parseFloat(longitude), foto_bukti_path: file_path } });
        res.json(checkin);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/geotagging/:id', authenticateToken, upload.single('foto'), async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;
        const updateData = {};
        if (latitude) updateData.latitude = parseFloat(latitude);
        if (longitude) updateData.longitude = parseFloat(longitude);
        if (req.file) {
            let stNumber = req.headers['x-st-number'] || 'Lainnya';
            const safeFolderName = stNumber.replace(/[/\\]/g, '_').trim();
            updateData.foto_bukti_path = `/uploads/${safeFolderName}/${req.file.filename}`;
        }
        const updated = await prisma.geotaggingCheckin.update({ where: { id }, data: updateData });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/spj', authenticateToken, async (req, res) => {
    try {
        let where = req.user?.role === 'PEGAWAI' ? { pegawai_id: req.user.id } : {};
        const data = await prisma.spj.findMany({ where, include: { sppd: true, pegawai: true }, orderBy: { created_at: 'desc' } });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/spj', authenticateToken, upload.fields([{ name: 'tiket' }, { name: 'taksi' }, { name: 'hotel' }]), async (req, res) => {
    try {
        const { sppd_id, pegawai_id, uang_harian_tarif, uang_harian_jumlah_hari, biaya_transportasi_tiket, biaya_transportasi_taksi, biaya_penginapan_tarif, biaya_penginapan_jumlah_malam, total_biaya_riil } = req.body;
        const files = req.files || {};
        let stNumber = req.headers['x-st-number'] || 'Lainnya';
        const safeFolderName = stNumber.replace(/[/\\]/g, '_').trim();
        const getPath = (f) => f ? `/uploads/${safeFolderName}/${f[0].filename}` : null;
        const spj = await prisma.spj.create({
            data: { sppd_id, pegawai_id, uang_harian_tarif: parseFloat(uang_harian_tarif), uang_harian_jumlah_hari: parseInt(uang_harian_jumlah_hari), biaya_transportasi_tiket: parseFloat(biaya_transportasi_tiket), biaya_transportasi_taksi: parseFloat(biaya_transportasi_taksi), biaya_penginapan_tarif: parseFloat(biaya_penginapan_tarif), biaya_penginapan_jumlah_malam: parseInt(biaya_penginapan_jumlah_malam), total_biaya_riil: parseFloat(total_biaya_riil), file_bukti_tiket_path: getPath(files['tiket']), file_bukti_taksi_path: getPath(files['taksi']), file_bukti_hotel_path: getPath(files['hotel']), status_verifikasi: 'DIAJUKAN' }
        });
        res.json(spj);
    } catch (e) {
        console.error("POST /api/spj error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/spj/:id', authenticateToken, upload.fields([{ name: 'tiket' }, { name: 'taksi' }, { name: 'hotel' }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { sppd_id, pegawai_id, uang_harian_tarif, uang_harian_jumlah_hari, biaya_transportasi_tiket, biaya_transportasi_taksi, biaya_penginapan_tarif, biaya_penginapan_jumlah_malam, total_biaya_riil } = req.body;
        const files = req.files || {};
        let stNumber = req.headers['x-st-number'] || 'Lainnya';
        const safeFolderName = stNumber.replace(/[/\\]/g, '_').trim();
        const getPath = (f) => f ? `/uploads/${safeFolderName}/${f[0].filename}` : undefined;

        const dataToUpdate = { uang_harian_tarif: parseFloat(uang_harian_tarif), uang_harian_jumlah_hari: parseInt(uang_harian_jumlah_hari), biaya_transportasi_tiket: parseFloat(biaya_transportasi_tiket), biaya_transportasi_taksi: parseFloat(biaya_transportasi_taksi), biaya_penginapan_tarif: parseFloat(biaya_penginapan_tarif), biaya_penginapan_jumlah_malam: parseInt(biaya_penginapan_jumlah_malam), total_biaya_riil: parseFloat(total_biaya_riil) };
        if (files['tiket']) dataToUpdate.file_bukti_tiket_path = getPath(files['tiket']);
        if (files['taksi']) dataToUpdate.file_bukti_taksi_path = getPath(files['taksi']);
        if (files['hotel']) dataToUpdate.file_bukti_hotel_path = getPath(files['hotel']);

        const spj = await prisma.spj.update({
            where: { id },
            data: dataToUpdate
        });
        res.json(spj);
    } catch (e) {
        console.error("PUT /api/spj/:id error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const sppdAktif = await prisma.sppd.count({ where: { status: 'DITERBITKAN' } });
        const persetujuanND = await prisma.notaDinas.count({ where: { status: 'DIAJUKAN' } });
        const persetujuanST = await prisma.suratTugas.count({ where: { status_persetujuan: 'MENUNGGU_KPA' } });
        const totalPerjalanan = await prisma.suratTugas.count({ where: { status_persetujuan: 'DITERBITKAN' } });
        const recentST = await prisma.suratTugas.findMany({ take: 5, orderBy: { created_at: 'desc' }, include: { nota_dinas: { include: { pengusul: true } } } });
        res.json({ sppdAktif, persetujuan: persetujuanND + persetujuanST, totalPerjalanan, recentST });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve frontend for any other routes (SPA fallback)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[Backend] Server menyala pada http://localhost:${PORT}`);
});
