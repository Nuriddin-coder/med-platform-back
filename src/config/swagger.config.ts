import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createSwaggerDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('MED Platform API')
    .setDescription(
      'MED Healthcare Platform Backend API Hujjatlari (Contract asosida yagona haqiqat manbai)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Bearer <accessToken> formatida access tokenni kiriting',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Health', 'Tizim ishchi holatini tekshirish')
    .addTag('Auth', 'Autentifikatsiya va avtorizatsiya')
    .addTag('Users', 'Foydalanuvchilarni boshqarish')
    .addTag('Patients', 'Bemorlar profili va maʼlumotlari')
    .addTag('Doctors', 'Shifokorlar profili, jadvallari va xizmatlari')
    .addTag('Clinics', 'Klinikalar va ish soatlari')
    .addTag('Specializations', 'Shifokorlik mutaxassisliklari')
    .addTag('Services', 'Klinika va shifokor xizmatlari')
    .addTag('Appointments', 'Qabullarga yozilish va boshqarish')
    .addTag('Medical', 'Tibbiy yozuvlar va hujjatlar')
    .addTag('Notifications', 'Bildirishnomalar')
    .addTag('Reviews', 'Shifokorlarga fikr-mulohazalar')
    .addTag('Uploads', 'Fayllar va rasmlarni yuklash')
    .addTag('Admin', 'Administrator paneli: statistika, sozlamalar, loglar')
    .addTag('Public', 'Ommaviy maʼlumotlar (landing page)')
    .build();

  return SwaggerModule.createDocument(app, config);
}

