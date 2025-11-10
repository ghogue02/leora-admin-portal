import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type CreateImportBatchInput = {
  tenantId: string;
  dataType: string;
  source: string;
  templateId?: string | null;
  fileKey?: string | null;
  checksum?: string | null;
  summary?: Prisma.JsonValue;
  initiatedById?: string | null;
};

export async function createImportBatch(db: DbClient, input: CreateImportBatchInput) {
  return db.importBatch.create({
    data: {
      tenantId: input.tenantId,
      dataType: input.dataType,
      source: input.source,
      status: "queued",
      templateId: input.templateId ?? null,
      fileKey: input.fileKey ?? null,
      checksum: input.checksum ?? null,
      initiatedById: input.initiatedById ?? null,
      summary: input.summary,
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          dataType: true,
        },
      },
    },
  });
}

export type ListImportBatchOptions = {
  tenantId: string;
  status?: string[];
  dataType?: string;
  limit?: number;
  offset?: number;
};

export async function listImportBatches(db: DbClient, options: ListImportBatchOptions) {
  const { tenantId, status, dataType, limit = 20, offset = 0 } = options;

  return db.importBatch.findMany({
    where: {
      tenantId,
      ...(status?.length ? { status: { in: status } } : {}),
      ...(dataType ? { dataType } : {}),
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip: offset,
    take: limit,
    include: {
      template: {
        select: {
          id: true,
          name: true,
        },
      },
      initiatedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      _count: {
        select: {
          rows: true,
        },
      },
    },
  });
}

export async function getImportBatch(db: DbClient, tenantId: string, batchId: string) {
  return db.importBatch.findFirst({
    where: {
      id: batchId,
      tenantId,
    },
    include: {
      template: true,
      initiatedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}
