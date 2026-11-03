# MED PLATFORM — API CONTRACT (YAGONA HAQIQAT MANBAI)

QOIDA: Bu fayldagi nom, enum, path va key'larni HECH QACHON o'zgartirma, tarjima qilma, qisqartirma.
O'zgartirish kerak bo'lsa — avval shu faylni yangila, keyin kodni.

## 1. Umumiy qoidalar
- Base URL: `/api/v1`
- JSON key'lar: **camelCase** (`firstName`, `createdAt`)
- DB (Prisma): model nomi PascalCase, ustun `@map("snake_case")`, jadval `@@map("snake_case")`
- Enum qiymatlari: **UPPER_SNAKE_CASE** (string)
- ID: UUID string (`id: string`)
- Sana-vaqt: ISO 8601 UTC string (`createdAt`: "2026-11-02T10:00:00.000Z")
- Faqat sana: `"YYYY-MM-DD"` (`appointmentDate`); faqat vaqt: `"HH:mm"` (`startTime`, `endTime`)
- Biznes timezone: Asia/Tashkent
- Pul: butun son (Int), so'mda (`consultationPrice`, `price`)
- `dayOfWeek`: 1=Dushanba ... 7=Yakshanba (ISO)
- Null bo'lishi mumkin maydonlar `null` qaytadi, key yo'qolmaydi (undefined emas)

## 2. Javob formati (HAMMA endpoint)
Muvaffaqiyat:
{ "success": true, "data": <obyekt yoki massiv>, "meta": { "page":1, "limit":10, "total":57, "totalPages":6 } }
(`meta` faqat ro'yxatlarda)

Xato:
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ { "field":"email", "message":"…" } ] } }

Error code'lar: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT,
SLOT_ALREADY_BOOKED, INVALID_CREDENTIALS, USER_BLOCKED, EMAIL_NOT_VERIFIED,
TOKEN_EXPIRED, TOKEN_INVALID, FILE_INVALID, INTERNAL_ERROR

HTTP: 200, 201, 400, 401, 403, 404, 409, 422, 500

## 3. Ro'yxat query parametrlari (hamma ro'yxatda bir xil)
`page` (default 1), `limit` (default 10, max 100), `search`, `sortBy`, `sortOrder` (`asc`|`desc`)

## 4. Enumlar
Role: SUPER_ADMIN | ADMIN | DOCTOR | PATIENT | CLINIC_MANAGER
AppointmentStatus: PENDING | CONFIRMED | CANCELLED | COMPLETED | REJECTED
UserStatus: ACTIVE | BLOCKED | PENDING_VERIFICATION
Gender: MALE | FEMALE
NotificationType: APPOINTMENT_CREATED | APPOINTMENT_CONFIRMED | APPOINTMENT_CANCELLED |
  APPOINTMENT_RESCHEDULED | APPOINTMENT_REJECTED | NEW_PATIENT_BOOKED | APPOINTMENT_REMINDER
MedicalDocumentType: LAB_RESULT | DIAGNOSIS | PRESCRIPTION | IMAGING | OTHER

## 5. Auth
- Access token: `Authorization: Bearer <accessToken>`
- Tokenlar javob body'sida qaytadi: `{ accessToken, refreshToken, user }`
- Access 15 min, refresh 7 kun. Refresh rotation: har refresh'da yangi juftlik, eskisi bekor.
- `user` obyekti: { id, email|null, phone|null, firstName, lastName, avatarUrl|null, role, status, isEmailVerified, createdAt }

## 6. Asosiy obyektlar (response key'lari)
Specialization: { id, name, slug, description|null, iconUrl|null, isActive }
Service:        { id, name, description|null, price, durationMinutes, clinicId, isActive }
Clinic:         { id, name, address, city, phone, email|null, description|null, logoUrl|null,
                  imageUrls:string[], workingHours:[{dayOfWeek,openTime,closeTime,isClosed}],
                  rating, reviewsCount, isActive, services:Service[] (faqat detail'da) }
Doctor:         { id, userId, firstName, lastName, avatarUrl|null, specialization:{id,name,slug},
                  specializationId, experienceYears, bio|null, education|null,
                  certificates:[{id,title,fileUrl}], consultationPrice, rating, reviewsCount,
                  clinics:[{id,name,city,address}], isActive }
DoctorSchedule: { id, doctorId, clinicId, dayOfWeek, startTime, endTime, slotDurationMinutes, isActive }
TimeSlot:       { startTime, endTime, isAvailable }
Patient:        { id, userId, firstName, lastName, birthDate|null, gender|null, phone|null,
                  email|null, address|null, avatarUrl|null, bloodType|null, allergies|null }
Appointment:    { id, patientId, doctorId, clinicId, serviceId|null, appointmentDate, startTime, endTime,
                  reason|null, status, cancelReason|null, createdAt, updatedAt,
                  patient:{id,firstName,lastName,phone|null}, doctor:{id,firstName,lastName,avatarUrl|null,specialization:{id,name}},
                  clinic:{id,name,address} }
MedicalRecord:  { id, patientId, doctorId, appointmentId|null, diagnosis, conclusion, recommendations|null,
                  createdAt, doctor:{id,firstName,lastName}, documents:MedicalDocument[] }
MedicalDocument:{ id, patientId, recordId|null, uploadedById, type, title, fileName, mimeType, size, createdAt }
   (fayl URL'i yo'q — faqat himoyalangan `GET /medical-documents/:id/download`)
Notification:   { id, userId, type, title, message, data|null, isRead, createdAt }
Review:         { id, doctorId, patientId, rating(1-5), comment|null, createdAt, patient:{firstName,lastName} }
AdminLog:       { id, adminId, action, entity, entityId|null, metadata|null, ipAddress|null, createdAt, admin:{id,firstName,lastName} }
UploadedImage:  { url, fileName, mimeType, size }

## 7. Endpointlar  (A=ADMIN/SUPER_ADMIN, M=CLINIC_MANAGER, D=DOCTOR, P=PATIENT, *=public)

### Auth
POST /auth/register          *  body { firstName, lastName, email?, phone?, password }  (email yoki phone majburiy; role doim PATIENT)
POST /auth/login             *  body { login, password }   (login = email yoki phone)
POST /auth/refresh           *  body { refreshToken }
POST /auth/logout            all body { refreshToken }
POST /auth/forgot-password   *  body { login }
POST /auth/reset-password    *  body { token, newPassword }
POST /auth/verify-email      *  body { token }
POST /auth/resend-verification all
GET  /auth/me                all
PATCH /auth/me               all body { firstName?, lastName?, avatarUrl? }
PATCH /auth/change-password  all body { oldPassword, newPassword }

### Users (A)
GET /users (query: role, status) | GET /users/:id | POST /users | PATCH /users/:id | DELETE /users/:id
PATCH /users/:id/block | PATCH /users/:id/unblock
POST/PATCH body: { firstName, lastName, email?, phone?, password?(faqat POST), role, status? }

### Specializations
GET /specializations * | GET /specializations/:id * | POST, PATCH /:id, DELETE /:id (A)
body: { name, slug?, description?, iconUrl?, isActive? }

### Services
GET /services * (query: clinicId) | GET /services/:id * | POST, PATCH /:id, DELETE /:id (A, M)
body: { name, description?, price, durationMinutes, clinicId, isActive? }

### Clinics
GET /clinics * (query: search, city, serviceId, minRating) | GET /clinics/:id * | POST (A) | PATCH /:id (A, M o'ziniki) | DELETE /:id (A)
POST /clinics/:id/doctors   (A, M)  body { doctorId }
DELETE /clinics/:id/doctors/:doctorId (A, M)
body POST/PATCH: { name, address, city, phone, email?, description?, logoUrl?, imageUrls?, workingHours?, managerId?, isActive? }

### Doctors
GET /doctors * (query: search, specializationId, clinicId, city, serviceId, minPrice, maxPrice, minRating, date)
GET /doctors/:id *  | POST (A) | PATCH /:id (A) | DELETE /:id (A)
GET /doctors/me (D) | PATCH /doctors/me (D)
GET /doctors/:id/slots *  query: date (YYYY-MM-DD, majburiy), clinicId (majburiy)  -> TimeSlot[]
GET /doctors/:id/reviews *  (paginated)
GET /doctors/me/schedules (D) | PUT /doctors/me/schedules (D) body { schedules: [{clinicId,dayOfWeek,startTime,endTime,slotDurationMinutes,isActive}] }
GET /doctors/me/patients (D) -> Patient[] (paginated)
POST body (A): { email, phone?, password, firstName, lastName, specializationId, experienceYears, bio?, education?, consultationPrice, clinicIds? }
PATCH body: { firstName?, lastName?, avatarUrl?, specializationId?, experienceYears?, bio?, education?, consultationPrice?, isActive? }
POST /doctors/me/certificates (D) body { title, fileUrl } | DELETE /doctors/me/certificates/:id (D)

### Patients
GET /patients (A, D(faqat o'zinikilari)) | GET /patients/:id (A, D-ruxsatli) | PATCH /patients/:id (A)
GET /patients/me (P) | PATCH /patients/me (P)
body PATCH: { firstName?, lastName?, birthDate?, gender?, phone?, email?, address?, avatarUrl?, bloodType?, allergies? }

### Appointments  (GET ro'yxat rolga qarab avtomatik filtrlanadi)
GET /appointments  query: status, doctorId, patientId, clinicId, dateFrom, dateTo  (A: hammasi, D: o'ziniki, P: o'ziniki, M: klinikasiniki)
GET /appointments/:id
POST /appointments (P) body { doctorId, clinicId, serviceId?, appointmentDate, startTime, reason? }
PATCH /appointments/:id/reschedule (P) body { appointmentDate, startTime }
PATCH /appointments/:id/cancel (P, A) body { cancelReason? }
PATCH /appointments/:id/confirm (D, A)
PATCH /appointments/:id/reject (D, A) body { cancelReason? }
PATCH /appointments/:id/complete (D, A)
PATCH /appointments/:id/status (A) body { status }

### Medical
GET /medical-records query: patientId (P: faqat o'ziniki; D: faqat u bilan qabuli bor bemor; A: hammasi)
GET /medical-records/:id | POST (D) body { patientId, appointmentId?, diagnosis, conclusion, recommendations? }
PATCH /medical-records/:id (D, muallif)
GET /medical-documents query: patientId, recordId, type
POST /medical-documents (D, P) multipart/form-data: fields { patientId, recordId?, type, title }, file field nomi: `file` (PDF/JPG/PNG, max 10MB)
GET /medical-documents/:id/download (ruxsat tekshiriladi, stream)
DELETE /medical-documents/:id (muallif yoki A)

### Notifications (hamma login qilganlar, faqat o'zinikini)
GET /notifications (query: isRead) | GET /notifications/unread-count -> { count }
PATCH /notifications/:id/read | PATCH /notifications/read-all

### Reviews
POST /reviews (P, faqat COMPLETED qabuli bor) body { doctorId, appointmentId, rating, comment? }

### Uploads (rasm)
POST /uploads/image multipart: `file`, field `folder` = avatar | clinic-logo | clinic-image | diploma  -> UploadedImage
Rasmlar statik: `/uploads/...` (ochiq). Tibbiy hujjatlar FAQAT download endpoint orqali.

### Admin
GET /admin/stats -> { totalUsers, totalDoctors, totalPatients, totalClinics, todayAppointments,
                      confirmedAppointments, cancelledAppointments, newUsersThisWeek }
GET /admin/stats/appointments-chart?days=30 -> [{ date, total, confirmed, cancelled }]
GET /admin/logs (A, paginated; query: action, entity, adminId)
GET /admin/settings | PATCH /admin/settings   body { platformName, supportPhone, supportEmail }
GET /admin/permissions | PUT /admin/permissions/:userId  body { permissions: string[] }

### Public (landing)
GET /public/overview -> { doctorsCount, clinicsCount, specializationsCount, patientsCount }

## 8. Environment variable nomlari (O'ZGARMAYDI)
backend/.env:  PORT, NODE_ENV, DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
               JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, CORS_ORIGINS, UPLOAD_DIR,
               MAX_FILE_SIZE_MB, APP_URL, WEB_URL, ADMIN_URL, SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD
admin/.env:    VITE_API_URL   (masalan http://localhost:4000/api/v1)
web/.env.local: NEXT_PUBLIC_API_URL (masalan http://localhost:4000/api/v1)

## 9. Portlar
backend 4000 | admin 5173 | web 3000

## 10. Biznes qoidalari
- Bitta doktor + bir sana + bir startTime ga faqat bitta faol (PENDING/CONFIRMED) qabul. DB'da partial unique index + transaction. Aks holda 409 SLOT_ALREADY_BOOKED.
- O'tgan vaqtga yozilib bo'lmaydi.
- Qabul yaratilganda → doktorga NEW_PATIENT_BOOKED, bemorga APPOINTMENT_CREATED notification.
- Confirm/Reject/Cancel/Reschedule → mos notification.
- Bemor boshqa bemorning ma'lumotini ko'ra olmaydi. Doktor faqat u bilan qabuli bo'lgan bemorni ko'radi.
- Reset/verify token MVP'da email yubormaydi: development rejimida console'ga chiqariladi va response'da `devToken` sifatida qaytadi (faqat NODE_ENV=development).