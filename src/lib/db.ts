import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function ensureDatabaseExists() {
  if (!fs.existsSync(dbPath)) {
    try {
      console.log('\n[Auto-Init] Local SQLite database not found. Generating dev.db...');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: process.cwd() });
      console.log('[Auto-Init] Database schema pushed successfully!\n');
    } catch (error) {
      console.error('[Auto-Init Error] Failed to run npx prisma db push:', error);
    }
  }
}

const prismaClientSingleton = () => {
  ensureDatabaseExists();
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Auto-seed default owner account if database is freshly created
(async () => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const ownerEmail = 'owner@business.com';
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
      console.log('[Auto-Seed] Created default Owner: owner@business.com / OwnerPassword123!');
    }
  } catch (err) {
    // Ignore initial setup race conditions
  }
})();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
