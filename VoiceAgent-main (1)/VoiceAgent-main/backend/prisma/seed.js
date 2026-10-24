import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@seagull.com' },
    update: { passwordHash: hash },
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@seagull.com',
      passwordHash: hash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('✓ Seeded admin:', admin.email);

  const courses = [
    { slug: 'iit-jee', name: 'IIT-JEE Preparation', duration: '2 years', feeMonthly: 8000, batchTimings: 'Morning (7–9 AM) and Evening (5–7 PM)', description: 'Intensive preparation for IIT-JEE Mains and Advanced covering Physics, Chemistry, and Mathematics.' },
    { slug: 'neet-ug', name: 'NEET-UG Preparation', duration: '2 years', feeMonthly: 7500, batchTimings: 'Morning (7–9 AM) and Afternoon (2–4 PM)', description: 'Comprehensive NEET-UG preparation covering Physics, Chemistry, and Biology.' },
    { slug: 'mht-cet', name: 'MHT-CET Preparation', duration: '1 year', feeMonthly: 5000, batchTimings: 'Morning and Evening batches available', description: 'Focused MHT-CET preparation for Maharashtra state engineering and pharmacy entrance.' },
    { slug: '11-12-science', name: '11th & 12th Science (PCMB)', duration: '2 years', feeMonthly: 4500, batchTimings: 'Morning (8–10 AM) and Evening (6–8 PM)', description: 'Board-focused PCMB coaching with conceptual clarity and exam strategy.' },
    { slug: '9-10-foundation', name: '9th & 10th Foundation', duration: '2 years', feeMonthly: 3500, batchTimings: 'After school batches (4–6 PM)', description: 'Strong foundation in Science and Mathematics for Class 9 and 10 students.' },
    { slug: '6-8-foundation', name: 'Foundation Course (6th–8th)', duration: '1–3 years', feeMonthly: 2500, batchTimings: 'Weekend batches (Sat–Sun)', description: 'Early foundation building for middle school students aiming for competitive exams.' },
    { slug: 'nda', name: 'NDA Preparation', duration: '1 year', feeMonthly: 6000, batchTimings: 'Morning batch (6–8 AM)', description: 'Complete NDA written exam and SSB interview preparation.' },
  ];

  for (const c of courses) {
    const course = await prisma.course.upsert({ where: { slug: c.slug }, update: {}, create: c });
    const existing = await prisma.batch.findFirst({ where: { courseId: course.id } });
    if (!existing) {
      await prisma.batch.create({
        data: { courseId: course.id, name: `${c.name} - Batch A`, timings: c.batchTimings, facultyName: 'TBD', maxSeats: 30 },
      });
    }
  }
  console.log('✓ Seeded', courses.length, 'courses with batches');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
