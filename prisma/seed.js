import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const saltRounds = 12;

    const users = [
        {
            nip: '000000000000000001',
            nama_lengkap: 'Administrator SPPD',
            pangkat_golongan: 'Pembina Utama / IV/e',
            jabatan: 'Administrator Sistem',
            role: 'ADMIN',
            password: 'admin123'
        },
        {
            nip: '197001012000011001',
            nama_lengkap: 'Dr. Ahmad Santoso, S.E., M.M.',
            pangkat_golongan: 'Pembina / IV/a',
            jabatan: 'Pejabat Pembuat Komitmen (PPK)',
            role: 'PPK',
            password: 'ppk12345'
        },
        {
            nip: '196505051990031002',
            nama_lengkap: 'Drs. Bambang Wicaksono, M.Si.',
            pangkat_golongan: 'Pembina Utama Madya / IV/d',
            jabatan: 'Sekretaris (KPA)',
            role: 'KPA',
            password: 'kpa12345'
        },
        {
            nip: '197005051995031001',
            nama_lengkap: 'H. Suryadi, M.Si.',
            pangkat_golongan: 'Pembina Utama / IV/e',
            jabatan: 'Ketua',
            role: 'KETUA',
            password: 'ketua123'
        },
        {
            nip: '197508082000032001',
            nama_lengkap: 'Hj. Fatimah, S.E.',
            pangkat_golongan: 'Pembina / IV/a',
            jabatan: 'Komisioner',
            role: 'KOMISIONER',
            password: 'komisioner123'
        },
        {
            nip: '198001012005011001',
            nama_lengkap: 'Budi Santoso, S.Kom, M.T.',
            pangkat_golongan: 'Penata / III/c',
            jabatan: 'Analis Sistem Informasi',
            role: 'PEGAWAI',
            password: 'pegawai123'
        },
    ];

    for (const u of users) {
        const password_hash = await bcrypt.hash(u.password, saltRounds);
        await prisma.user.upsert({
            where: { nip: u.nip },
            update: { password_hash },
            create: {
                nip: u.nip,
                nama_lengkap: u.nama_lengkap,
                pangkat_golongan: u.pangkat_golongan,
                jabatan: u.jabatan,
                role: u.role,
                password_hash
            }
        });
        console.log(`✅ Seeded: [${u.role}] ${u.nama_lengkap} (NIP: ${u.nip})`);
    }

    console.log('\n🎉 Seeding selesai! Gunakan NIP sebagai username.');
    console.table(users.map(u => ({ NIP: u.nip, Role: u.role, Password: u.password })));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
