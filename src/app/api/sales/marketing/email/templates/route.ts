/**
 * Email Templates API
 * GET /api/sales/marketing/email/templates - List all templates
 * POST /api/sales/marketing/email/templates - Create new template
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_TEMPLATES,
  getTemplatesByCategory,
} from "@/lib/marketing/email-templates-data";

const templateSourceSchema = z.enum(["all", "system", "custom"]).default("all");
const templateCategorySchema = z.string().optional();
const createTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  html: z.string().min(1),
  tokens: z.array(z.string()).optional(),
});

type SystemTemplate = (typeof EMAIL_TEMPLATES)[number];
type CustomTemplateDto = SystemTemplate & {
  isCustom: true;
  createdAt: Date;
  updatedAt?: Date | null;
};

/**
 * GET - List all email templates
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const category = templateCategorySchema.parse(searchParams.get("category"));
    const source = templateSourceSchema.parse(searchParams.get("source") ?? undefined);

    const templates: Array<SystemTemplate | CustomTemplateDto> = [];

    if (source === "all" || source === "system") {
      const systemTemplates = category
        ? getTemplatesByCategory(category)
        : EMAIL_TEMPLATES;

      templates.push(
        ...systemTemplates.map((template) => ({
          ...template,
          source: "system",
          isCustom: false as const,
        }))
      );
    }

    if (source === "all" || source === "custom") {
      const customTemplates = await prisma.emailTemplate.findMany({
        where: {
          tenantId,
          ...(category ? { category } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      templates.push(
        ...customTemplates.map<CustomTemplateDto>((template) => ({
          id: template.id,
          name: template.name,
          subject: template.subject,
          category: template.category,
          description: template.description ?? "",
          html: template.body,
          tokens: (template.metadata?.tokens as string[]) ?? [],
          source: "custom",
          isCustom: true,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        }))
      );
    }

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new custom template
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "";
    const body = createTemplateSchema.parse(await request.json());

    const template = await prisma.emailTemplate.create({
      data: {
        tenantId,
        name: body.name,
        subject: body.subject,
        category: body.category ?? "marketing",
        description: body.description ?? "",
        body: body.html,
        metadata: { tokens: body.tokens ?? [] },
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        category: template.category,
        description: template.description,
        html: template.body,
        tokens: (template.metadata?.tokens as string[]) ?? [],
        isCustom: true,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
