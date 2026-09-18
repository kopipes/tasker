import { NextResponse } from 'next/server';
import { getUserById, getAdminStats } from '@/lib/queries';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(userId);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const stats = getAdminStats();
  return NextResponse.json({ stats });
}
