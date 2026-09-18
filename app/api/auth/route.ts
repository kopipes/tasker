import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const user = getUserByEmail(parsed.data.email);
    if (!user) {
      return NextResponse.json({ error: { email: ['Email tidak terdaftar'] } }, { status: 401 });
    }
    const valid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: { password: ['Password salah'] } }, { status: 401 });
    }
    const cookieStore = await cookies();
    cookieStore.set('tasker_user_id', user.id, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    // Return user without password_hash
    const { password_hash: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch {
    return NextResponse.json({ error: 'Gagal login' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('tasker_user_id');
  return NextResponse.json({ ok: true });
}
