require('dotenv').config({ path: '.env.test' });

// Point Prisma at the test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Truncates all tables atomically using CASCADE to avoid FK ordering issues.
 */
async function cleanDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Task", "ProjectMember", "Project", "User" RESTART IDENTITY CASCADE'
  );
}

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await prisma.$disconnect();
});

global.prisma = prisma;
global.cleanDb = cleanDb;
