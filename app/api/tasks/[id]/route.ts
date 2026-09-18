import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, getTaskEvents, editTask, deleteTask, getUserById, findOrCreateProject, getProjectById } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const task = getTaskById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Only admin, the assignee, or the assigner can view the task
  const isAdmin = user.role === 'admin';
  const isInvolved = task.assigned_to_id === userId || task.assigned_by_id === userId;
  // Manager can view tasks in their division
  const isManagerOfDivision = user.role === 'manager' && user.divisi &&
    (task.assigned_to?.divisi === user.divisi || task.assigned_by?.divisi === user.divisi);

  if (!isAdmin && !isInvolved && !isManagerOfDivision) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const events = getTaskEvents(id);
  return NextResponse.json({ task, events });
}

const editSchema = z.object({
  title: z.string().min(1).optional(),
  brief: z.string().optional(),
  deadline: z.string().optional(),
  project_id: z.string().nullable().optional(),
  project_name: z.string().max(150).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const task = getTaskById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Only admin or the assigner can edit
  const isAdmin = user.role === 'admin';
  const isAssigner = task.assigned_by_id === userId;
  if (!isAdmin && !isAssigner) {
    return NextResponse.json({ error: 'Forbidden — hanya admin atau pemberi tugas yang bisa mengedit' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

    const fields: Parameters<typeof editTask>[2] = {
      title: parsed.data.title,
      brief: parsed.data.brief,
      deadline: parsed.data.deadline,
    };
    if (parsed.data.project_id !== undefined) fields.project_id = parsed.data.project_id;
    if (parsed.data.project_name !== undefined) {
      const name = parsed.data.project_name.trim();
      fields.project_id = name ? findOrCreateProject(name, userId).id : null;
    }
    if (fields.project_id) {
      if (!getProjectById(fields.project_id)) {
        return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 });
      }
    }

    const updatedTask = editTask(id, userId, fields);
    return NextResponse.json({ task: updatedTask });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal mengedit tugas';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(userId);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin yang bisa menghapus tugas' }, { status: 403 });
  }

  const { id } = await params;
  const task = getTaskById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  try {
    deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus tugas';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

