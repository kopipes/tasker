import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Ukuran file melebihi 4MB' }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: 'File kosong' }, { status: 400 });

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.name) || '';
    const safeName = `${uuidv4()}${ext}`;
    const storagePath = path.join(UPLOAD_DIR, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storagePath, buffer);

    const kind = file.type.startsWith('image/') ? 'image' : 'file';
    // Return a temp ID — DB row is created when the task event is committed
    const tempId = uuidv4();

    return NextResponse.json({
      id: tempId,
      filename: file.name,
      kind,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      storage_path: `/uploads/${safeName}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload gagal';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
