import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, getProjectById, countProjectTasks, deleteProject } from '@/lib/queries';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin yang bisa menghapus project' }, { status: 403 });
  }

  const { id } = await params;
  const project = getProjectById(id);
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 });

  const taskCount = countProjectTasks(id);
  if (taskCount > 0) {
    return NextResponse.json(
      {
        error: `Project "${project.name}" masih berisi ${taskCount} tugas. Pindahkan atau hapus tugas tersebut terlebih dahulu.`,
        task_count: taskCount,
      },
      { status: 409 },
    );
  }

  try {
    deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus project';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
