import { NextRequest, NextResponse } from 'next/server';
import { submitTask } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';

const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  kind: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  storage_path: z.string(),
});

const schema = z.object({
  link: z.string().url().optional().or(z.literal('')),
  note: z.string().optional(),
  attachments: z.array(attachmentSchema).optional().default([]),
}).refine(d => (d.link && d.link.length > 0) || (d.attachments && d.attachments.length > 0), {
  message: 'Minimal satu dari link atau lampiran harus diisi',
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const task = submitTask(id, userId, parsed.data);
    return NextResponse.json({ task });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menyerahkan hasil';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
