import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type SeedRole = 'MEMBER' | 'TEAM_LEAD';

type SeedAccount = {
  email: string;
  name: string;
  role: SeedRole;
  password: string;
};

// These non-production credentials are intended only for sign-in and role-authorization testing.
const seedAccounts: SeedAccount[] = [
  {
    email: 'member@example.test',
    name: 'Development Member',
    role: 'MEMBER',
    password: 'member-dev-password',
  },
  {
    email: 'team-lead@example.test',
    name: 'Development Team Lead',
    role: 'TEAM_LEAD',
    password: 'team-lead-dev-password',
  },
];

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development fixture accounts must not be seeded in production.');
  }

  const prisma = new PrismaClient();

  try {
    for (const account of seedAccounts) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      await prisma.user.upsert({
        where: { email: account.email },
        create: {
          email: account.email,
          name: account.name,
          role: account.role,
          passwordHash,
        },
        update: {
          name: account.name,
          role: account.role,
          passwordHash,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  console.error('Failed to seed development accounts:', error);
  process.exitCode = 1;
});
