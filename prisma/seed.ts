import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@example.com';
  const passwordHash = bcrypt.hashSync('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Demo User', username: 'demo', passwordHash },
    create: {
      email,
      name: 'Demo User',
      username: 'demo',
      passwordHash
    }
  });

  const org = await prisma.organization.upsert({
    where: { id: 'seed-demo-org' },
    update: { name: 'Demo Org' },
    create: { id: 'seed-demo-org', name: 'Demo Org' }
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id
      }
    },
    update: { role: 'ADMIN' },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'ADMIN'
    }
  });

  console.log('Seed OK:', { userId: user.id, orgId: org.id, email: user.email, username: user.username });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
