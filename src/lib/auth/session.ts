import type { Prisma, PrismaClient } from "@prisma/client";

export async function getActivePortalSession(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  sessionId: string,
) {
  return db.portalSession.findFirst({
    where: {
      id: sessionId,
      tenantId,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      portalUser: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
