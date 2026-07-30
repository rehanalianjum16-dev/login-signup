const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = 'owner@business.com';
  const existingOwner = await prisma.user.findUnique({
    where: { email: ownerEmail }
  });

  if (!existingOwner) {
    const passwordHash = await bcrypt.hash('OwnerPassword123!', 12);
    await prisma.user.create({
      data: {
        name: 'System Owner',
        email: ownerEmail,
        passwordHash,
        role: 'OWNER',
        isVerified: true
      }
    });
    console.log('\n=============================================');
    console.log('SUCCESS: Initial OWNER account seeded!');
    console.log(`Email: ${ownerEmail}`);
    console.log('Password: OwnerPassword123!');
    console.log('=============================================\n');
  } else {
    console.log('OWNER account already exists, skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
