import type { Prisma, PrismaClient } from "@prisma/client";

export type SalesSession = {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: Date;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    salesRep: {
      id: string;
      territoryName: string;
      isActive: boolean;
    } | null;
    roles: Array<{
      role: {
        code: string;
        permissions: Array<{
          permission: {
            code: string;
          };
        }>;
      };
    }>;
  };
};

export async function createSalesSession(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  userId: string,
  sessionId: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<SalesSession> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
      tenantId,
    },
    include: {
      salesRepProfile: {
        select: {
          id: true,
          territoryName: true,
          isActive: true,
        },
      },
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
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Store session in database
  await db.salesSession.create({
    data: {
      id: sessionId,
      tenantId,
      userId,
      expiresAt,
      refreshToken,
    },
  });

  const session: SalesSession = {
    id: sessionId,
    userId,
    tenantId,
    expiresAt,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      salesRep: user.salesRepProfile,
      roles: user.roles,
    },
  };

  return session;
}

export async function getActiveSalesSession(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  sessionId: string,
): Promise<SalesSession | null> {
  // Get session from database
  const dbSession = await db.salesSession.findUnique({
    where: {
      id: sessionId,
    },
  });

  if (!dbSession) {
    return null;
  }

  if (dbSession.tenantId !== tenantId) {
    return null;
  }

  if (dbSession.expiresAt < new Date()) {
    // Clean up expired session
    await db.salesSession.delete({
      where: { id: sessionId },
    });
    return null;
  }

  // Get fresh user data from database
  const user = await db.user.findUnique({
    where: {
      id: dbSession.userId,
      tenantId,
    },
    include: {
      salesRepProfile: {
        select: {
          id: true,
          territoryName: true,
          isActive: true,
        },
      },
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
  });

  if (!user || !user.isActive) {
    // Clean up session for inactive user
    await db.salesSession.delete({
      where: { id: sessionId },
    });
    return null;
  }

  return {
    id: dbSession.id,
    userId: dbSession.userId,
    tenantId: dbSession.tenantId,
    expiresAt: dbSession.expiresAt,
    refreshToken: dbSession.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      salesRep: user.salesRepProfile,
      roles: user.roles,
    },
  };
}

export async function deleteSalesSession(
  db: PrismaClient | Prisma.TransactionClient,
  sessionId: string,
): Promise<void> {
  await db.salesSession.delete({
    where: { id: sessionId },
  }).catch(() => {
    // Session might not exist, ignore error
  });
}
