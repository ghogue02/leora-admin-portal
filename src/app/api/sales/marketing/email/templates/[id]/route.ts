/**
 * Single Email Template API
 * GET /api/sales/marketing/email/templates/[id] - Get template by ID
 * PUT /api/sales/marketing/email/templates/[id] - Update template
 * DELETE /api/sales/marketing/email/templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTemplateById } from '@/lib/marketing/email-templates-data';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET - Get single template
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const { id } = params;

    // Check system templates first
    const systemTemplate = getTemplateById(id);
    if (systemTemplate) {
      return NextResponse.json({
        template: {
          ...systemTemplate,
          source: 'system',
          isCustom: false,
        },
      });
    }

    // Check custom templates
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        category: template.category,
        description: template.description,
        html: template.body,
        tokens: template.metadata?.tokens || [],
        source: 'custom',
        isCustom: true,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update template
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const { id } = params;

    // Can't update system templates
    if (getTemplateById(id)) {
      return NextResponse.json(
        { error: 'Cannot update system templates' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, subject, category, description, html, tokens } = body;

    const template = await prisma.emailTemplate.update({
      where: {
        id,
        tenantId,
      },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(html && { body: html }),
        ...(tokens && { metadata: { tokens } }),
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
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete template
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const { id } = params;

    // Can't delete system templates
    if (getTemplateById(id)) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 400 }
      );
    }

    await prisma.emailTemplate.delete({
      where: {
        id,
        tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
