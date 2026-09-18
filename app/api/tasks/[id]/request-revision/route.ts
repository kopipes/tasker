import { NextRequest, NextResponse } from 'next/server';
import { requestRevision } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  note: z.string().min(1, 'Catatan revisi wajib diisi'),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const task = requestRevision(id, userId, parsed.data.note);
    return NextResponse.json({ task });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal meminta revisi';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
