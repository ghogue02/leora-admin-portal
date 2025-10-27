/**
 * Email Templates API
 * GET /api/sales/marketing/email/templates - List all templates
 * POST /api/sales/marketing/email/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EMAIL_TEMPLATES, getTemplateById, getTemplatesByCategory } from '@/lib/marketing/email-templates-data';

/**
 * GET - List all email templates
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const source = searchParams.get('source') || 'all'; // 'all', 'system', 'custom'

    let templates: any[] = [];

    // Get system templates
    if (source === 'all' || source === 'system') {
      const systemTemplates = category
        ? getTemplatesByCategory(category as any)
        : EMAIL_TEMPLATES;

      templates.push(
        ...systemTemplates.map((t) => ({
          ...t,
          source: 'system',
          isCustom: false,
        }))
      );
    }

    // Get custom templates from database
    if (source === 'all' || source === 'custom') {
      const customTemplates = await prisma.emailTemplate.findMany({
        where: {
          tenantId,
          ...(category && { category }),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      templates.push(
        ...customTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          category: t.category,
          description: t.description || '',
          html: t.body,
          tokens: [], // Parse from body
          source: 'custom',
          isCustom: true,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }))
      );
    }

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new custom template
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const userId = request.headers.get('x-user-id') || '';

    const body = await request.json();
    const { name, subject, category, description, html, tokens } = body;

    // Validate required fields
    if (!name || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, html' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.emailTemplate.create({
      data: {
        tenantId,
        name,
        subject,
        category: category || 'marketing',
        description,
        body: html,
        metadata: { tokens: tokens || [] },
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
        isCustom: true,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
