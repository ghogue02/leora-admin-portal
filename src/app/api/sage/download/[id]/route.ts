import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';

type DownloadType = 'standard' | 'sample';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminSession(request, async ({ tenantId, db }) => {
    const exportId = params.id;
    const type = (request.nextUrl.searchParams.get('type') as DownloadType) || 'standard';

    if (!['standard', 'sample'].includes(type)) {
      return NextResponse.json({ error: 'Invalid download type' }, { status: 400 });
    }

    const record = await db.sageExport.findFirst({
      where: {
        id: exportId,
        tenantId,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    const fileName = type === 'sample' ? record.sampleFileName : record.fileName;
    const fileContent = type === 'sample' ? record.sampleFileContent : record.fileContent;

    if (!fileName || !fileContent) {
      return NextResponse.json({ error: 'File not available for download' }, { status: 404 });
    }

    const buffer = fileContent instanceof Buffer ? fileContent : Buffer.from(fileContent);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
