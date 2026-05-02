import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 10000 dummy records...');
  
  // 1. Get an existing User to assign
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No User found. Run seed-admin.js first to get at least one user.');
    return;
  }
  
  console.log(`Using user ID: ${user.id} for associations`);
  
  const BATCH_SIZE = 1000;
  const TOTAL_RECORDS = 10000;
  
  for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
    const batchedNotaDinas = [];
    console.log(`Generating batch ${i / BATCH_SIZE + 1} / ${TOTAL_RECORDS / BATCH_SIZE}`);
    
    // Generate data
    for (let j = 0; j < BATCH_SIZE; j++) {
      const idx = i + j;
      batchedNotaDinas.push({
        nomor_nd: `ND-DUMMY-${idx}-${Date.now()}/2026`,
        tanggal_nd: new Date().toISOString(),
        perihal: `Dummy Perihal Surat Tugas ${idx}`,
        tujuan: `Kota Dummy ${idx % 100}`,
        pegawai_ditugaskan: user.nama_lengkap,
        pengusul_id: user.id,
      });
    }
    
    console.log(`Inserting ${batchedNotaDinas.length} Nota Dinas...`);
    await prisma.notaDinas.createMany({
      data: batchedNotaDinas,
    });
    
    console.log(`Fetching inserted Nota Dinas for creating Surat Tugas...`);
    const insertedNDs = await prisma.notaDinas.findMany({
      where: { nomor_nd: { startsWith: `ND-DUMMY-${i}` } },
      select: { id: true, nomor_nd: true }
    });
    
    if(insertedNDs.length > 0) {
      const batchedSuratTugas = [];
      const batchedPegawaiST = [];

      for(let j=0; j<insertedNDs.length; j++) {
        const nd = insertedNDs[j];
         batchedSuratTugas.push({
            nota_dinas_id: nd.id,
            nomor_st: `ST-DUMMY-${i+j}-${Date.now()}/2026`,
            tanggal_st: new Date().toISOString(),
            menimbang: `Menimbang dummy ${i+j}`,
            dasar: `Dasar dummy ${i+j}`,
            untuk: `Untuk dummy ${i+j}`,
            status_persetujuan: 'DITERBITKAN',
         });
      }
      
      console.log(`Inserting ${batchedSuratTugas.length} Surat Tugas...`);
      await prisma.suratTugas.createMany({
        data: batchedSuratTugas
      });

      console.log(`Fetching inserted Surat Tugas...`);
      const insertedSTs = await prisma.suratTugas.findMany({
        where: { nomor_st: { startsWith: `ST-DUMMY-${i}` } },
        select: { id: true }
      });

      for(const st of insertedSTs) {
        batchedPegawaiST.push({
            surat_tugas_id: st.id,
            pegawai_id: user.id
        });
      }

      console.log(`Inserting ${batchedPegawaiST.length} SuratTugasPegawai...`);
      await prisma.suratTugasPegawai.createMany({
          data: batchedPegawaiST
      });
    }
  }
  
  console.log('Finished seeding 10000 dummy records!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
