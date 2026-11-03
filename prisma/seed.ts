import { PrismaClient, Role, UserStatus, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@med.uz';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin123!@#';
  const passwordHash = await argon2.hash(superAdminPassword);
  const defaultUserPassword = await argon2.hash('MedPassword2026!');

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      phone: '+998901112233',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`✓ Super Admin created/verified: ${superAdmin.email}`);

  // 2. Specializations (10 items)
  const specializationsData = [
    { name: 'Kardiologiya', slug: 'kardiolog', description: 'Yurak va qon-tomir kasalliklari diagnostikasi va davolash', iconUrl: '/icons/cardiology.svg' },
    { name: 'Nevrologiya', slug: 'nevrolog', description: 'Asab tizimi kasalliklari mutaxassisi', iconUrl: '/icons/neurology.svg' },
    { name: 'Pediatriya', slug: 'pediatr', description: 'Bolalar salomatligi va rivojlanishi nazorati', iconUrl: '/icons/pediatrics.svg' },
    { name: 'Stomatologiya', slug: 'stomatolog', description: 'Tish va milk kasalliklarini davolash', iconUrl: '/icons/stomatology.svg' },
    { name: 'Dermatologiya', slug: 'dermatolog', description: 'Teri va teri osti kasalliklari', iconUrl: '/icons/dermatology.svg' },
    { name: 'Oftalmologiya', slug: 'oftalmolog', description: 'Ko‘z kasalliklari va ko‘rish qobiliyatini tiklash', iconUrl: '/icons/ophthalmology.svg' },
    { name: 'Terapiya', slug: 'terapevt', description: 'Umumiy amaliyot shifokori, ichki kasalliklar', iconUrl: '/icons/therapy.svg' },
    { name: 'Ortopediya', slug: 'ortoped', description: 'Tayanch-harakat a’zolari kasalliklari va jarohatlar', iconUrl: '/icons/orthopedics.svg' },
    { name: 'Ginekologiya', slug: 'ginekolog', description: 'Ayollar reproduktiv salomatligi', iconUrl: '/icons/gynecology.svg' },
    { name: 'Urologiya', slug: 'urolog', description: 'Siydik-tanosil tizimi kasalliklari', iconUrl: '/icons/urology.svg' },
  ];

  const specializations = [];
  for (const spec of specializationsData) {
    const s = await prisma.specialization.upsert({
      where: { slug: spec.slug },
      update: {},
      create: spec,
    });
    specializations.push(s);
  }
  console.log(`✓ 10 Specializations created`);

  // 3. Clinics (3 items)
  const clinicsData = [
    {
      name: 'Shox Med Center',
      address: "Mirobod t., Oybek ko'chasi, 12",
      city: 'Toshkent',
      phone: '+998712001122',
      email: 'shox@med.uz',
      description: 'Zamonaviy ko‘p tarmoqli tibbiyot markazi',
      logoUrl: '/logos/shox.png',
      imageUrls: ['/images/clinics/shox-1.jpg', '/images/clinics/shox-2.jpg'],
      rating: 4.8,
      reviewsCount: 42,
    },
    {
      name: 'Akfa Medline',
      address: "Olmazor t., Kichik halqa yo'li, 5A",
      city: 'Toshkent',
      phone: '+998712033003',
      email: 'info@akfamedline.uz',
      description: 'O‘rta Osiyodagi eng yirik xususiy tibbiyot markazi',
      logoUrl: '/logos/akfa.png',
      imageUrls: ['/images/clinics/akfa-1.jpg', '/images/clinics/akfa-2.jpg'],
      rating: 4.9,
      reviewsCount: 88,
    },
    {
      name: 'Hayat Medical Center',
      address: "Yunusobod t., Amir Temur shox ko'chasi, 88",
      city: 'Toshkent',
      phone: '+998712005577',
      email: 'contact@hayatmed.uz',
      description: 'Yuqori aniqlikdagi diagnostika va statsionar davolash markazi',
      logoUrl: '/logos/hayat.png',
      imageUrls: ['/images/clinics/hayat-1.jpg'],
      rating: 4.7,
      reviewsCount: 31,
    },
  ];

  const clinics = [];
  for (const cData of clinicsData) {
    let clinic = await prisma.clinic.findFirst({ where: { name: cData.name } });
    if (!clinic) {
      clinic = await prisma.clinic.create({ data: cData });
    }
    clinics.push(clinic);

    // Working hours (1..6 open, 7 closed)
    for (let day = 1; day <= 7; day++) {
      await prisma.clinicWorkingHour.upsert({
        where: {
          clinicId_dayOfWeek: {
            clinicId: clinic.id,
            dayOfWeek: day,
          },
        },
        update: {},
        create: {
          clinicId: clinic.id,
          dayOfWeek: day,
          openTime: '08:00',
          closeTime: '18:00',
          isClosed: day === 7,
        },
      });
    }

    // Sample services
    const services = [
      { name: 'Birlamchi konsultatsiya', description: 'Shifokor ko‘rigi va birlamchi tashxis', price: 150000, durationMinutes: 30 },
      { name: 'Qayta konsultatsiya', description: 'Tahlillar asosida davolash rejasini tuzish', price: 100000, durationMinutes: 20 },
      { name: 'EKG tekshiruvi', description: 'Yurak elektrokardiogrammasi va xulosa', price: 80000, durationMinutes: 15 },
    ];
    for (const s of services) {
      const existingService = await prisma.service.findFirst({
        where: { clinicId: clinic.id, name: s.name },
      });
      if (!existingService) {
        await prisma.service.create({
          data: {
            ...s,
            clinicId: clinic.id,
          },
        });
      }
    }
  }
  console.log(`✓ 3 Clinics with working hours & services created`);

  // 4. Doctors (6 items)
  const doctorsData = [
    {
      firstName: 'Anvar',
      lastName: 'Karimov',
      email: 'anvar.karimov@med.uz',
      phone: '+998901001001',
      specIndex: 0, // Kardiologiya
      clinicIndex: 0,
      experienceYears: 12,
      bio: 'Oliy toifali kardiolog, tibbiyot fanlari nomzodi.',
      education: 'Toshkent Tibbiyot Akademiyasi (2012)',
      consultationPrice: 200000,
      rating: 4.9,
      reviewsCount: 35,
    },
    {
      firstName: 'Nilufar',
      lastName: 'Rahimova',
      email: 'nilufar.rahimova@med.uz',
      phone: '+998901001002',
      specIndex: 1, // Nevrologiya
      clinicIndex: 0,
      experienceYears: 8,
      bio: 'Bosh og‘rig‘i va uyqu buzilishlari bo‘yicha tajribali mutaxassis.',
      education: 'Samarqand Davlat Tibbiyot Universiteti (2016)',
      consultationPrice: 180000,
      rating: 4.8,
      reviewsCount: 22,
    },
    {
      firstName: 'Rustam',
      lastName: 'Usmonov',
      email: 'rustam.usmonov@med.uz',
      phone: '+998901001003',
      specIndex: 2, // Pediatriya
      clinicIndex: 1,
      experienceYears: 15,
      bio: 'Katta tajribaga ega yetakchi pediatr.',
      education: 'Toshkent Pediatriya Tibbiyot Instituti (2009)',
      consultationPrice: 160000,
      rating: 5.0,
      reviewsCount: 48,
    },
    {
      firstName: 'Dildora',
      lastName: 'Alimova',
      email: 'dildora.alimova@med.uz',
      phone: '+998901001004',
      specIndex: 3, // Stomatologiya
      clinicIndex: 1,
      experienceYears: 7,
      bio: 'Estetik stomatologiya va tish restavratsiyasi mutaxassisi.',
      education: 'Toshkent Davlat Stomatologiya Instituti (2017)',
      consultationPrice: 150000,
      rating: 4.7,
      reviewsCount: 19,
    },
    {
      firstName: 'Jasur',
      lastName: 'Nazarov',
      email: 'jasur.nazarov@med.uz',
      phone: '+998901001005',
      specIndex: 4, // Dermatologiya
      clinicIndex: 2,
      experienceYears: 10,
      bio: 'Dermatokosmetolog, teri kasalliklari diagnostikasi bo‘yicha ekspert.',
      education: 'Toshkent Tibbiyot Akademiyasi (2014)',
      consultationPrice: 170000,
      rating: 4.9,
      reviewsCount: 27,
    },
    {
      firstName: 'Malika',
      lastName: 'Saidova',
      email: 'malika.saidova@med.uz',
      phone: '+998901001006',
      specIndex: 5, // Oftalmologiya
      clinicIndex: 2,
      experienceYears: 9,
      bio: 'Lazerli ko‘rish korreksiyasi va mikroxirurgiya mutaxassisi.',
      education: 'Toshkent Tibbiyot Akademiyasi (2015)',
      consultationPrice: 190000,
      rating: 4.8,
      reviewsCount: 31,
    },
  ];

  for (const doc of doctorsData) {
    let user = await prisma.user.findUnique({ where: { email: doc.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: doc.email,
          phone: doc.phone,
          passwordHash: defaultUserPassword,
          firstName: doc.firstName,
          lastName: doc.lastName,
          role: Role.DOCTOR,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        },
      });
    }

    const specialization = specializations[doc.specIndex];
    const clinic = clinics[doc.clinicIndex];

    let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          specializationId: specialization.id,
          experienceYears: doc.experienceYears,
          bio: doc.bio,
          education: doc.education,
          consultationPrice: doc.consultationPrice,
          rating: doc.rating,
          reviewsCount: doc.reviewsCount,
          isActive: true,
        },
      });
    }

    // Link doctor to clinic
    await prisma.clinicDoctor.upsert({
      where: {
        clinicId_doctorId: {
          clinicId: clinic.id,
          doctorId: doctor.id,
        },
      },
      update: {},
      create: {
        clinicId: clinic.id,
        doctorId: doctor.id,
      },
    });

    // Doctor schedule (Monday to Friday, 09:00 - 17:00, 30 min)
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorSchedule.upsert({
        where: {
          doctorId_clinicId_dayOfWeek_startTime: {
            doctorId: doctor.id,
            clinicId: clinic.id,
            dayOfWeek: day,
            startTime: '09:00',
          },
        },
        update: {},
        create: {
          doctorId: doctor.id,
          clinicId: clinic.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          isActive: true,
        },
      });
    }
  }
  console.log(`✓ 6 Doctors created with schedules & clinic assignments`);

  // 5. Patients (3 items)
  const patientsData = [
    {
      firstName: 'Bekzod',
      lastName: 'Toshmatov',
      email: 'bekzod.patient@gmail.com',
      phone: '+998902002001',
      birthDate: new Date('1992-05-14T00:00:00.000Z'),
      gender: Gender.MALE,
      address: 'Toshkent sh., Chilonzor t., 19-mavze',
      bloodType: 'A(II) Rh+',
      allergies: 'Penitsillin',
    },
    {
      firstName: 'Shahnoza',
      lastName: 'Qosimova',
      email: 'shahnoza.patient@gmail.com',
      phone: '+998902002002',
      birthDate: new Date('1998-11-23T00:00:00.000Z'),
      gender: Gender.FEMALE,
      address: 'Toshkent sh., Yakkasaroy t., Shota Rustaveli ko‘chasi, 45',
      bloodType: 'O(I) Rh+',
      allergies: 'Yo‘q',
    },
    {
      firstName: 'Bobur',
      lastName: 'Ergashev',
      email: 'bobur.patient@gmail.com',
      phone: '+998902002003',
      birthDate: new Date('1985-02-08T00:00:00.000Z'),
      gender: Gender.MALE,
      address: 'Toshkent sh., Yunusobod t., 11-mavze',
      bloodType: 'B(III) Rh-',
      allergies: 'Paratsetamol',
    },
  ];

  for (const pat of patientsData) {
    let user = await prisma.user.findUnique({ where: { email: pat.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: pat.email,
          phone: pat.phone,
          passwordHash: defaultUserPassword,
          firstName: pat.firstName,
          lastName: pat.lastName,
          role: Role.PATIENT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        },
      });
    }

    await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        birthDate: pat.birthDate,
        gender: pat.gender,
        address: pat.address,
        bloodType: pat.bloodType,
        allergies: pat.allergies,
      },
    });
  }
  console.log(`✓ 3 Patients created`);

  // 6. Platform Settings
  const settings = [
    { key: 'platformName', value: 'MED Medical Platform' },
    { key: 'supportPhone', value: '+998712000000' },
    { key: 'supportEmail', value: 'support@med.uz' },
  ];
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`✓ Platform settings seeded`);

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

