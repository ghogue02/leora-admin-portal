import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { uploadImageToSupabase } from '@/lib/storage';

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId }) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'A file is required.' },
          { status: 400 }
        );
      }

      const url = await uploadImageToSupabase(file, tenantId, 'invoice_logo');
      return NextResponse.json({ url });
    } catch (error) {
      console.error('Failed to upload invoice logo', error);
      return NextResponse.json(
        { error: 'Failed to upload logo' },
        { status: 500 }
      );
    }
  });
}
