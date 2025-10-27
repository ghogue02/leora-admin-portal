import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Schema for creating templates
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  options: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Query all active templates
    const templates = await prisma.sampleFeedbackTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Group by category
    const grouped = templates.reduce((acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    return NextResponse.json({
      templates: grouped,
      all: templates,
    });
  } catch (error) {
    console.error('[FeedbackTemplates] GET Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // Create template
    const template = await prisma.sampleFeedbackTemplate.create({
      data: validatedData,
    });

    console.log('[FeedbackTemplates] Template created:', template.id);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('[FeedbackTemplates] POST Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Update template
    const template = await prisma.sampleFeedbackTemplate.update({
      where: { id },
      data: updates,
    });

    console.log('[FeedbackTemplates] Template updated:', template.id);

    return NextResponse.json(template);
  } catch (error) {
    console.error('[FeedbackTemplates] PATCH Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.sampleFeedbackTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    console.log('[FeedbackTemplates] Template deleted:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FeedbackTemplates] DELETE Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
