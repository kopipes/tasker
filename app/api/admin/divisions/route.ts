import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getUserById, getAllDivisions, createDivision } from '@/lib/queries';

const schema = z.object({ name: z.string().min(1).max(100) });

export async function GET() {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin' }, { status: 403 });
  }
  return NextResponse.json({ divisions: getAllDivisions() });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin' }, { status: 403 });
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const division = createDivision(parsed.data.name);
    return NextResponse.json({ division }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal membuat divisi';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
