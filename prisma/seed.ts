import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Create super admin if doesn't exist
  const existing = await prisma.user.findUnique({ where: { email: 'admin@silver.co.il' } });

  if (!existing) {
    const hash = await bcrypt.hash('silver2026', 10);
    await prisma.user.create({
      data: {
        email: 'admin@silver.co.il',
        passwordHash: hash,
        name: 'Silver Admin',
        role: 'super_admin',
        phone: '',
      },
    });
    console.log('✅ Super admin created: admin@silver.co.il / silver2026');
  } else {
    console.log('ℹ️  Super admin already exists');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
