import { NextRequest, NextResponse } from 'next/server';
import { createTask, getAllUsers, getUserById, findOrCreateProject, getProjectById } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';

const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  kind: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  storage_path: z.string(),
});

const schema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  brief: z.string().optional().default(''),
  note: z.string().optional().default(''),
  deadline: z.string().min(1, 'Deadline wajib diisi'),
  assigned_to_id: z.string().min(1, 'Penerima tugas wajib dipilih'),
  assigned_by_id: z.string().optional(),
  project_id: z.string().nullable().optional(),
  project_name: z.string().max(150).optional(),
  links: z.array(z.string()).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const users = getAllUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requester = getUserById(userId);
  if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // Admin may create a task on behalf of another assigner.
    let assignedById = userId;
    if (parsed.data.assigned_by_id && parsed.data.assigned_by_id !== userId) {
      if (requester.role !== 'admin') {
        return NextResponse.json({ error: 'Hanya admin yang bisa memilih pemberi tugas lain' }, { status: 403 });
      }
      const assigner = getUserById(parsed.data.assigned_by_id);
      if (!assigner) return NextResponse.json({ error: 'Pemberi tugas tidak ditemukan' }, { status: 404 });
      assignedById = assigner.id;
    }

    const assignee = getUserById(parsed.data.assigned_to_id);
    if (!assignee) return NextResponse.json({ error: 'Penerima tugas tidak ditemukan' }, { status: 404 });
    if (assignee.id === assignedById) {
      return NextResponse.json({ error: 'Pemberi dan penerima tugas tidak boleh sama' }, { status: 400 });
    }

    // Resolve project: explicit id wins, otherwise find-or-create by name
    let projectId: string | null = null;
    if (parsed.data.project_id) {
      const project = getProjectById(parsed.data.project_id);
      if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 });
      projectId = project.id;
    } else if (parsed.data.project_name && parsed.data.project_name.trim()) {
      projectId = findOrCreateProject(parsed.data.project_name, requester.id).id;
    }

    const task = createTask({
      ...parsed.data,
      assigned_by_id: assignedById,
      project_id: projectId,
      links: parsed.data.links.filter(l => l.trim().length > 0),
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Gagal membuat tugas' }, { status: 500 });
  }
}
