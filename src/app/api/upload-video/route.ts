import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && url.startsWith("http") && !url.includes("your_supabase_project_url") && serviceKey);
}

/**
 * GET /api/upload-video
 *
 * Generates a signed upload URL for the browser to upload directly to Supabase Storage,
 * completely bypassing Vercel serverless function payload size limits (4.5MB).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get('candidateId');
    const filename = searchParams.get('filename') || 'video.mp4';

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const bucketName = 'interview-recordings';
      const fileExt    = (filename.split('.').pop() || 'mp4').toLowerCase();
      const uploadPath = `admin_uploads/${candidateId}_${Date.now()}.${fileExt}`;
      
      const supabase = getServiceSupabase();

      // Create signed upload URL (valid for 15 minutes)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(uploadPath);

      if (error || !data) {
        console.error('[upload-video] Failed to create signed upload URL:', error);
        return NextResponse.json({ error: error?.message || 'Failed to create signed upload URL' }, { status: 500 });
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uploadPath}`;

      console.log('[upload-video] Generated direct upload URL for path:', uploadPath);

      return NextResponse.json({
        success: true,
        directUpload: true,
        uploadUrl: data.signedUrl,
        publicUrl: publicUrl,
        videoUrl: publicUrl
      });
    } else {
      console.log('[upload-video] Supabase not configured. Direct upload not available.');
      return NextResponse.json({
        success: true,
        directUpload: false,
        message: 'Supabase not configured, use local upload fallback'
      });
    }
  } catch (err: any) {
    console.error('[upload-video] GET server error:', err);
    return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 });
  }
}

/**
 * POST /api/upload-video
 *
 * Accepts a raw video file upload from the admin browser and proxies it to
 * Supabase Storage using the SERVICE ROLE KEY, which bypasses RLS.
 * Or saves locally if Supabase is not configured.
 *
 * Body: FormData with fields:
 *   file / video — the video File
 *   candidateId  — string, used to build the storage path
 *
 * Returns: { publicUrl: string, videoUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('video')) as File | null;
    const candidateId = formData.get('candidateId') as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided or file is empty' }, { status: 400 });
    }
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    let videoUrl = "";

    if (isSupabaseConfigured()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const bucketName = 'interview-recordings';
      const fileExt    = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const uploadPath = `admin_uploads/${candidateId}_${Date.now()}.${fileExt}`;
      const uploadUrl  = `${supabaseUrl}/storage/v1/object/${bucketName}/${uploadPath}`;

      console.log('[upload-video] Uploading to Supabase:', uploadUrl);
      console.log('[upload-video] File:', file.name, 'Size:', file.size, 'Type:', file.type);

      const fileBuffer = await file.arrayBuffer();

      const supabaseRes = await fetch(uploadUrl, {
        method:  'PUT',
        headers: {
          Authorization:  `Bearer ${serviceKey}`,
          'x-upsert':     'true',
          'Content-Type': file.type || 'video/mp4',
          'Content-Length': String(fileBuffer.byteLength),
        },
        body: fileBuffer,
      });

      const responseText = await supabaseRes.text();
      console.log('[upload-video] Supabase status:', supabaseRes.status, responseText);

      if (!supabaseRes.ok) {
        return NextResponse.json(
          { error: `Supabase upload failed: ${supabaseRes.status} — ${responseText}` },
          { status: supabaseRes.status },
        );
      }

      videoUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uploadPath}`;
      console.log('[upload-video] Success — publicUrl:', videoUrl);
    } else {
      console.log('[upload-video] Mock Supabase connection: saving video locally...');
      const filename = `${candidateId}-${Date.now()}.mp4`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      videoUrl = `/uploads/${filename}`;
      console.log('[upload-video] Successfully saved locally:', videoUrl);
    }

    return NextResponse.json({
      success: true,
      publicUrl: videoUrl,
      videoUrl: videoUrl
    }, { status: 200 });

  } catch (err: any) {
    console.error('[upload-video] Server error:', err);
    return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 });
  }
}
