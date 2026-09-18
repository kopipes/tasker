import { NextResponse } from 'next/server';
import { getUserById, getDashboard } from '@/lib/queries';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const dashboard = getDashboard(userId);
  return NextResponse.json({ user, dashboard });
}
