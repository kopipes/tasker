import { NextRequest, NextResponse } from 'next/server';
import { getUserById, createUser } from '@/lib/queries';
import { cookies } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  divisi: z.string().optional().default(''),
  additional_divisi: z.array(z.string()).optional().default([]),
  role: z.enum(['admin', 'manager', 'user']).default('user'),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get('tasker_user_id')?.value;
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requester = getUserById(requesterId);
  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — hanya admin yang bisa membuat pengguna' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

    const { name, email, divisi, additional_divisi, role, password } = parsed.data;
    const password_hash = await bcrypt.hash(password, 10);
    const user = createUser(name, email, divisi, role, password_hash, additional_divisi);
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal membuat pengguna';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
