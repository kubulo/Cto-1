import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';

export async function getDemoUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'demo.user@example.com' },
    include: {
      conversations: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 5,
          },
        },
      },
      reports: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      energyMetrics: {
        take: 5,
        orderBy: { recordedAt: 'desc' },
      },
      consistencyMetrics: {
        take: 1,
        orderBy: { recordedAt: 'desc' },
      },
    },
  });

  return user;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  getDemoUser()
    .then((user) => {
      console.dir(user, { depth: 4 });
    })
    .catch((error) => {
      console.error('Failed to fetch demo user:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
