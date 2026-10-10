/**
 * Seeds the database only when it has no users yet. Safe to run on every
 * deploy (it's part of the Vercel build): first deploy gets demo data,
 * later deploys never touch real data.
 */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';

const db = new PrismaClient();
db.user
  .count()
  .then(async (n) => {
    await db.$disconnect();
    if (n > 0 || process.env.SKIP_SEED === '1') {
      console.log(`[seed] skipped (${n} users already)`);
      return;
    }
    console.log('[seed] empty database, seeding demo data…');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  })
  .catch((e) => {
    console.error('[seed] check failed', e);
    process.exit(1);
  });
