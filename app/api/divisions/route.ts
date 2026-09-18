import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllDivisions } from '@/lib/queries';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ divisions: getAllDivisions() });
}
