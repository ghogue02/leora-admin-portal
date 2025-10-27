/**
 * Templates API
 * GET /api/sales/marketing/templates - List all templates (email & SMS)
 * POST /api/sales/marketing/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'email' or 'sms'

    if (type === 'email') {
      const templates = await prisma.emailTemplate.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(templates);
    }

    if (type === 'sms') {
      const templates = await prisma.sMSTemplate.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(templates);
    }

    return NextResponse.json(
      { error: 'Type parameter required (email or sms)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const userId = request.headers.get('x-user-id') || '';

    const body = await request.json();
    const { type, name, subject, body: templateBody, category, isShared } =
      body;

    if (type === 'email') {
      const template = await prisma.emailTemplate.create({
        data: {
          tenantId,
          name,
          subject,
          body: templateBody,
          category,
          isShared: isShared || false,
          createdById: userId,
        },
      });
      return NextResponse.json(template, { status: 201 });
    }

    if (type === 'sms') {
      const template = await prisma.sMSTemplate.create({
        data: {
          tenantId,
          name,
          body: templateBody,
          category,
          createdById: userId,
        },
      });
      return NextResponse.json(template, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Type must be email or sms' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
