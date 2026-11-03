# MED Platform — Backend (NestJS)

"MED" tibbiyot platformasi backend API tizimi.

Loyiha arxitekturasi va barcha endpointlar **`contract.md`** talablari asosida qat'iy ishlab chiqilgan.

---

## 🛠 Texnologiyalar
- **Framework**: NestJS 12 + TypeScript (strict mode)
- **Database & ORM**: PostgreSQL 16 + Prisma ORM 6
- **Auth**: JWT (Access 15m + Refresh 7d, rotation), Argon2
- **Validation**: `class-validator` + `class-transformer`
- **Security**: Helmet, Throttler (Rate Limiting), CORS
- **Documentation**: Swagger / OpenAPI (`/api/docs`)
- **Containers**: Docker & Docker Compose

---

## 📁 Papkalar tuzilishi

```text
med-platform-back/
├── contract.md                 # Yagona haqiqat manbai (API shartnomasi)
├── docker-compose.yml          # PostgreSQL 16 va Backend servislari
├── Dockerfile                  # Production konteyner fayli
├── README.md                   # Ishga tushirish qo'llanmasi
├── .env                        # Muhit o'zgaruvchilari
├── .env.example                # Muhit o'zgaruvchilari namunasi
├── contract/
│   └── openapi.json            # Frontend uchun avtomatik generatsiya qilingan OpenAPI JSON
├── prisma/
│   ├── schema.prisma           # To'liq Prisma schemasi
│   ├── seed.ts                 # Super admin, klinikalar, doktorlar, bemorlar seed skripti
│   └── migrations/             # SQL migratsiyalar (partial unique index bilan)
└── src/
    ├── common/                 # Interceptor, Filter, Pipe, Exception, DTOlar
    ├── config/                 # ConfigModule va Env validatsiyasi
    ├── prisma/                 # PrismaService va PrismaModule
    ├── modules/                # Biznes modullari (auth, users, doctors, clinics, appointments, ...)
    ├── main.ts                 # Ilova kirish nuqtasi
    └── export-openapi.ts       # openapi.json generatsiya skripti
```

---

## ⚙️ O'rnatish va ishga tushirish qadamlari

### 1. Bog'liqliklarni o'rnatish
```bash
npm install
```

### 2. Muhit o'zgaruvchilarini sozlash
`.env.example` faylidan nusxa olib `.env` faylini yarating va kerakli qiymatlarni kiriting:
```bash
cp .env.example .env
```

### 3. PostgreSQL ma'lumotlar bazasini ishga tushirish (Docker orqali)
```bash
docker compose up -d postgres
```
*(Agar kompyuteringizda Docker o'rnatilmagan bo'lsa, lokal PostgreSQL 16 yoki tashqi PostgreSQL (masalan, Neon, Supabase) ulab, `DATABASE_URL` ni `.env` da ko'rsatishingiz mumkin).*

### 4. Prisma Client generatsiya qilish va Migratsiyani qo'llash
```bash
# Prisma mijozini generatsiya qilish
npm run prisma:generate

# Migratsiyalarni DB ga tushirish
npm run prisma:migrate
```

### 5. Dastlabki ma'lumotlarni to'ldirish (Database Seed)
```bash
npm run prisma:seed
```
Ushbu skript quyidagilarni avtomatik yaratadi:
- **1 ta Super Admin**: `admin@med.uz` / `Admin123!@#`
- **10 ta mutaxassislik** (Kardiologiya, Nevrologiya, Pediatriya, Stomatologiya, ...)
- **3 ta klinika** (Shox Med Center, Akfa Medline, Hayat Medical Center) — ish soatlari va namunaviy xizmatlar bilan
- **6 ta doktor** — haftalik jadvallari va klinikalarga biriktirilgan holda
- **3 ta namunaviy bemor**
- **Platforma sozlamalari**

### 6. Development rejimida ishga tushirish
```bash
npm run start:dev
```
Server ishga tushgach:
- **API Base URL**: `http://localhost:4000/api/v1`
- **Health Check**: `http://localhost:4000/api/v1/health`
- **Swagger Hujjatlari**: `http://localhost:4000/api/docs`

### 7. OpenAPI spetsifikatsiyasini eksport qilish
Frontend jamoasi tiplarni generatsiya qilishi uchun:
```bash
npm run export:openapi
```
Ushbu buyruq Swagger spetsifikatsiyasini `contract/openapi.json` fayliga eksport qiladi.

---

## 🛡 API Javob va Xatolik Standartlari

### Muvaffaqiyatli javob (ResponseInterceptor):
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 57, "totalPages": 6 }
}
```

### Xatolik javobi (AllExceptionFilter):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Kiritilgan maʼlumotlar validatsiyadan o‘tmadi",
    "details": [
      { "field": "email", "message": "email must be an email" }
    ]
  }
}
```
