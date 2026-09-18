import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, getAllProjectsWithCounts } from '@/lib/queries';

export async function GET() {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin' }, { status: 403 });
  }
  return NextResponse.json({ projects: getAllProjectsWithCounts() });
}
