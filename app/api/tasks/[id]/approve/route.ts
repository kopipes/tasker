import { NextRequest, NextResponse } from 'next/server';
import { approveTask } from '@/lib/queries';
import { cookies } from 'next/headers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const task = approveTask(id, userId);
    return NextResponse.json({ task });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menyetujui tugas';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
