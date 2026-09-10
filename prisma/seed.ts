import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Create super admin if doesn't exist
  const existing = await prisma.user.findUnique({ where: { email: 'admin@silver.co.il' } });

  if (!existing) {
    // Never hardcode a real password here: this file is committed to git,
    // so a fixed value here is permanently compromised the moment it's
    // pushed (readable by anyone with repo access, past or present, forever
    // — rotating the DB password later doesn't undo that). Generate a
    // random one-time password and print it once instead; whoever runs the
    // seed is expected to log in immediately and set a real password via
    // the admin panel.
    const tempPassword = crypto.randomBytes(12).toString('base64url');
    const hash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.create({
      data: {
        email: 'admin@silver.co.il',
        passwordHash: hash,
        name: 'Silver Admin',
        role: 'super_admin',
        phone: '',
      },
    });
    console.log('✅ Super admin created: admin@silver.co.il');
    console.log(`   Temporary password (shown once, not stored anywhere): ${tempPassword}`);
    console.log('   Log in now and change it — this value will not be shown again.');
  } else {
    console.log('ℹ️  Super admin already exists');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
