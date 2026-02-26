import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Memulai seeding admin...');
    const password_hash = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
        where: { nip: '000000000000000001' },
        update: {
            password_hash,
            nama_lengkap: 'Administrator SPPD',
            role: 'ADMIN',
            pangkat_golongan: 'Pembina Utama / IV/e',
            jabatan: 'Administrator Sistem'
        },
        create: {
            nip: '000000000000000001',
            nama_lengkap: 'Administrator SPPD',
            pangkat_golongan: 'Pembina Utama / IV/e',
            jabatan: 'Administrator Sistem',
            role: 'ADMIN',
            password_hash
        }
    });

    console.log('SUKSES: User Admin telah dibuat/diperbarui dengan NIP:', admin.nip);
}

main()
    .catch((e) => {
        console.error('ERROR saat seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
