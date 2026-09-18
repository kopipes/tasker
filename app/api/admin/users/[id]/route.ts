import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserProfile, deleteUser, getUserDivisions, setUserDivisions } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  divisi: z.string().optional(),
  additional_divisi: z.array(z.string()).optional(),
  role: z.enum(['admin', 'manager', 'user']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin yang bisa mengedit user lain' }, { status: 403 });
  }

  const { id } = await params;
  const target = getUserById(id);
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

    const updates: Parameters<typeof updateUserProfile>[1] = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.email) updates.email = parsed.data.email;
    if (parsed.data.role) {
      const { getDb } = await import('@/lib/db');
      getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(parsed.data.role, id);
    }

    if (parsed.data.divisi !== undefined || parsed.data.additional_divisi !== undefined) {
      const existing = getUserDivisions(id);
      const primary = parsed.data.divisi !== undefined
        ? parsed.data.divisi
        : (existing.find(d => d.is_primary)?.name ?? target.divisi ?? '');
      const additional = parsed.data.additional_divisi !== undefined
        ? parsed.data.additional_divisi
        : existing.filter(d => !d.is_primary).map(d => d.name);
      setUserDivisions(id, primary, additional);
    }

    if (Object.keys(updates).length > 0) updateUserProfile(id, updates);
    const user = getUserById(id);
    return NextResponse.json({ user, divisions: getUserDivisions(id) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal update user';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin yang bisa menghapus pengguna' }, { status: 403 });
  }

  const { id } = await params;
  if (id === requesterId) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
  }

  const target = getUserById(id);
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

  try {
    deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus pengguna';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
