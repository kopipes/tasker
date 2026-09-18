import { NextRequest, NextResponse } from 'next/server';
import { archiveTask } from '@/lib/queries';
import { cookies } from 'next/headers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const task = archiveTask(id, userId);
    return NextResponse.json({ task });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal mengarsipkan tugas';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
