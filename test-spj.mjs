import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
    try {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const sppd = await prisma.sppd.findFirst();

        if (!sppd) {
            console.log('No SPPD found for testing.');
            process.exit(1);
        }

        const payload = { id: admin.id, nip: admin.nip, nama: admin.nama_lengkap, role: admin.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'sppd_fallback_secret_change_me', { expiresIn: '1h' });

        const formData = new FormData();
        formData.append('sppd_id', sppd.id);
        formData.append('pegawai_id', admin.id);
        formData.append('uang_harian_tarif', '100000');
        formData.append('uang_harian_jumlah_hari', '3');
        formData.append('biaya_transportasi_tiket', '200000');
        formData.append('biaya_transportasi_taksi', '0');
        formData.append('biaya_penginapan_tarif', '0');
        formData.append('biaya_penginapan_jumlah_malam', '0');
        formData.append('total_biaya_riil', '500000');

        console.log('Sending request to http://localhost:80/api/spj...');

        const res = await fetch('http://localhost:80/api/spj', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-st-number': 'TEST/123'
            },
            body: formData
        });

        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);

        if (res.ok) {
            // Clean up
            const data = JSON.parse(text);
            if (data.id) {
                await prisma.spj.delete({ where: { id: data.id } });
                console.log('Test SPJ cleaned up.');
            }
        }
    } catch (err) {
        console.error('Fatal:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
