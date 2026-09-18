import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getUserById, getDivisionById, renameDivision, deleteDivision } from '@/lib/queries';

const schema = z.object({ name: z.string().min(1).max(100) });

async function requireAdmin() {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden — hanya admin' }, { status: 403 }) };
  }
  return { requester };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!getDivisionById(id)) return NextResponse.json({ error: 'Divisi tidak ditemukan' }, { status: 404 });

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const division = renameDivision(id, parsed.data.name);
    return NextResponse.json({ division });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal mengubah divisi';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!getDivisionById(id)) return NextResponse.json({ error: 'Divisi tidak ditemukan' }, { status: 404 });

  try {
    deleteDivision(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus divisi';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
