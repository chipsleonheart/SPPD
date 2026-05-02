const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Menghapus SPJ...');
    await prisma.spj.deleteMany();

    console.log('Menghapus Geotagging...');
    await prisma.geotaggingCheckin.deleteMany();

    console.log('Menghapus SPPD...');
    await prisma.sppd.deleteMany();

    console.log('Menghapus ST-Pegawai pivot...');
    await prisma.suratTugasPegawai.deleteMany();

    console.log('Menghapus Surat Tugas...');
    await prisma.suratTugas.deleteMany();

    console.log('Menghapus Nota Dinas...');
    await prisma.notaDinas.deleteMany();

    console.log('\n=== Selesai! Semua data dihapus kecuali users. ===\n');

    const users = await prisma.user.findMany({
        select: { nip: true, nama_lengkap: true, role: true }
    });
    console.log(`User tersisa: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.nip} ${u.nama_lengkap} (${u.role})`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
