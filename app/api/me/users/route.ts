import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/queries';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const users = getAllUsers();
  return NextResponse.json({ users });
}
