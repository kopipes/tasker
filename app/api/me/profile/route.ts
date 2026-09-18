import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserProfile, getUserDivisions, setUserDivisions } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  divisi: z.string().optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'Password minimal 6 karakter').optional(),
});

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

    const updates: Parameters<typeof updateUserProfile>[1] = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.divisi !== undefined) {
      const existingAdditional = getUserDivisions(userId).filter(d => !d.is_primary).map(d => d.name);
      setUserDivisions(userId, parsed.data.divisi, existingAdditional);
    }

    // Password change
    if (parsed.data.new_password) {
      if (!parsed.data.current_password) {
        return NextResponse.json({ error: { current_password: ['Password lama wajib diisi'] } }, { status: 400 });
      }
      const { getUserByEmail } = await import('@/lib/queries');
      const fullUser = getUserById(userId) as (ReturnType<typeof getUserById> & { password_hash?: string });
      // Get with password_hash
      const { getDb } = await import('@/lib/db');
      const row = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
      if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const valid = await bcrypt.compare(parsed.data.current_password, row.password_hash);
      if (!valid) return NextResponse.json({ error: { current_password: ['Password lama salah'] } }, { status: 400 });
      updates.password_hash = await bcrypt.hash(parsed.data.new_password, 10);
    }

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 });
    const user = updateUserProfile(userId, updates);
    return NextResponse.json({ user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal update profil';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
