import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@eduos.com';
  const plainPassword = 'AdminPassword123';
  
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User with email ${email} already exists.`);
    // Make sure it is SUPER_ADMIN
    if (existingUser.role !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'SUPER_ADMIN' },
      });
      console.log(`Updated existing user role to SUPER_ADMIN.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      className: 'N/A',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      subscription: {
        create: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
        },
      },
    },
  });

  console.log(`Seeded Super Admin user successfully: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
