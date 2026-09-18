import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getUserById, getAllProjects, createProject } from '@/lib/queries';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ projects: getAllProjects() });
}

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const project = createProject(parsed.data.name, userId, parsed.data.description ?? null);
    return NextResponse.json({ project }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal membuat project';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
