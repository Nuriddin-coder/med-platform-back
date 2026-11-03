import * as fs from 'fs';
import * as path from 'path';

interface Endpoint {
  method: string;
  path: string;
}

const contractEndpoints: Endpoint[] = [
  // Health
  { method: 'GET', path: '/health' },

  // Auth
  { method: 'POST', path: '/auth/register' },
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/refresh' },
  { method: 'POST', path: '/auth/logout' },
  { method: 'POST', path: '/auth/forgot-password' },
  { method: 'POST', path: '/auth/reset-password' },
  { method: 'POST', path: '/auth/verify-email' },
  { method: 'POST', path: '/auth/resend-verification' },
  { method: 'GET', path: '/auth/me' },
  { method: 'PATCH', path: '/auth/me' },
  { method: 'PATCH', path: '/auth/change-password' },

  // Users
  { method: 'GET', path: '/users' },
  { method: 'GET', path: '/users/{id}' },
  { method: 'POST', path: '/users' },
  { method: 'PATCH', path: '/users/{id}' },
  { method: 'DELETE', path: '/users/{id}' },
  { method: 'PATCH', path: '/users/{id}/block' },
  { method: 'PATCH', path: '/users/{id}/unblock' },

  // Specializations
  { method: 'GET', path: '/specializations' },
  { method: 'GET', path: '/specializations/{id}' },
  { method: 'POST', path: '/specializations' },
  { method: 'PATCH', path: '/specializations/{id}' },
  { method: 'DELETE', path: '/specializations/{id}' },

  // Services
  { method: 'GET', path: '/services' },
  { method: 'GET', path: '/services/{id}' },
  { method: 'POST', path: '/services' },
  { method: 'PATCH', path: '/services/{id}' },
  { method: 'DELETE', path: '/services/{id}' },

  // Clinics
  { method: 'GET', path: '/clinics' },
  { method: 'GET', path: '/clinics/{id}' },
  { method: 'POST', path: '/clinics' },
  { method: 'PATCH', path: '/clinics/{id}' },
  { method: 'DELETE', path: '/clinics/{id}' },
  { method: 'POST', path: '/clinics/{id}/doctors' },
  { method: 'DELETE', path: '/clinics/{id}/doctors/{doctorId}' },

  // Doctors
  { method: 'GET', path: '/doctors' },
  { method: 'GET', path: '/doctors/{id}' },
  { method: 'POST', path: '/doctors' },
  { method: 'PATCH', path: '/doctors/{id}' },
  { method: 'DELETE', path: '/doctors/{id}' },
  { method: 'GET', path: '/doctors/me' },
  { method: 'PATCH', path: '/doctors/me' },
  { method: 'GET', path: '/doctors/{id}/slots' },
  { method: 'GET', path: '/doctors/{id}/reviews' },
  { method: 'GET', path: '/doctors/me/schedules' },
  { method: 'PUT', path: '/doctors/me/schedules' },
  { method: 'GET', path: '/doctors/me/patients' },
  { method: 'POST', path: '/doctors/me/certificates' },
  { method: 'DELETE', path: '/doctors/me/certificates/{id}' },

  // Patients
  { method: 'GET', path: '/patients' },
  { method: 'GET', path: '/patients/{id}' },
  { method: 'PATCH', path: '/patients/{id}' },
  { method: 'GET', path: '/patients/me' },
  { method: 'PATCH', path: '/patients/me' },

  // Appointments
  { method: 'GET', path: '/appointments' },
  { method: 'GET', path: '/appointments/{id}' },
  { method: 'POST', path: '/appointments' },
  { method: 'PATCH', path: '/appointments/{id}/reschedule' },
  { method: 'PATCH', path: '/appointments/{id}/cancel' },
  { method: 'PATCH', path: '/appointments/{id}/confirm' },
  { method: 'PATCH', path: '/appointments/{id}/reject' },
  { method: 'PATCH', path: '/appointments/{id}/complete' },
  { method: 'PATCH', path: '/appointments/{id}/status' },

  // Medical
  { method: 'GET', path: '/medical-records' },
  { method: 'GET', path: '/medical-records/{id}' },
  { method: 'POST', path: '/medical-records' },
  { method: 'PATCH', path: '/medical-records/{id}' },
  { method: 'GET', path: '/medical-documents' },
  { method: 'POST', path: '/medical-documents' },
  { method: 'GET', path: '/medical-documents/{id}/download' },
  { method: 'DELETE', path: '/medical-documents/{id}' },

  // Notifications
  { method: 'GET', path: '/notifications' },
  { method: 'GET', path: '/notifications/unread-count' },
  { method: 'PATCH', path: '/notifications/{id}/read' },
  { method: 'PATCH', path: '/notifications/read-all' },

  // Reviews
  { method: 'POST', path: '/reviews' },

  // Uploads
  { method: 'POST', path: '/uploads/image' },

  // Admin
  { method: 'GET', path: '/admin/stats' },
  { method: 'GET', path: '/admin/stats/appointments-chart' },
  { method: 'GET', path: '/admin/logs' },
  { method: 'GET', path: '/admin/settings' },
  { method: 'PATCH', path: '/admin/settings' },
  { method: 'GET', path: '/admin/permissions' },
  { method: 'PUT', path: '/admin/permissions/{userId}' },

  // Public
  { method: 'GET', path: '/public/overview' },
];

function verifyContract() {
  const openApiPath = path.resolve(process.cwd(), 'contract', 'openapi.json');
  if (!fs.existsSync(openApiPath)) {
    console.error(`Error: ${openApiPath} does not exist! Run npm run export:openapi first.`);
    process.exit(1);
  }

  const openApiDoc = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));
  const paths = openApiDoc.paths || {};

  console.log(`Checking ${contractEndpoints.length} Contract Endpoints against OpenAPI Document...`);

  let missingCount = 0;
  for (const ep of contractEndpoints) {
    const fullApiPath = `/api/v1${ep.path}`;
    const pathItem = paths[fullApiPath];

    if (!pathItem) {
      console.error(`❌ MISSING PATH: ${ep.method} ${fullApiPath}`);
      missingCount++;
      continue;
    }

    const methodLower = ep.method.toLowerCase();
    if (!pathItem[methodLower]) {
      console.error(`❌ MISSING METHOD: ${ep.method} on ${fullApiPath}`);
      missingCount++;
      continue;
    }

    console.log(`✓ OK: ${ep.method} ${fullApiPath}`);
  }

  if (missingCount === 0) {
    console.log(`\n🎉 100% CONTRACT COMPLIANCE! All ${contractEndpoints.length} endpoints are implemented and match Contract!`);
  } else {
    console.error(`\n⚠️  Found ${missingCount} discrepancies between Contract and OpenAPI doc!`);
    process.exit(1);
  }
}

verifyContract();

