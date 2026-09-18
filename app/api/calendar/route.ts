import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getCalendarEvents, getTasksForCalendar, createCalendarEvent, getUserById } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const viewer = getUserById(userId);
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');

  const fromDate = fromRaw ? new Date(fromRaw) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const toDate = toRaw ? new Date(toRaw) : new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: 'Parameter tanggal tidak valid' }, { status: 400 });
  }

  const from = fromDate.toISOString();
  const to = toDate.toISOString();

  const includeTasks = searchParams.get('includeTasks') !== '0';

  const events = getCalendarEvents(userId, from, to);
  const tasks = includeTasks ? getTasksForCalendar(userId, from, to) : [];

  return NextResponse.json({ events, tasks });
}

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  note: z.string().max(2000).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  start_at: z.string().min(1),
  end_at: z.string().nullable().optional(),
  all_day: z.boolean().optional(),
  color: z.string().max(20).nullable().optional(),
  visibility: z.enum(['private', 'division', 'public', 'custom']).optional(),
  shared_user_ids: z.array(z.string()).max(200).optional(),
  owner_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const viewer = getUserById(userId);
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

    const d = parsed.data;
    const start = new Date(d.start_at);
    if (isNaN(start.getTime())) return NextResponse.json({ error: 'Tanggal mulai tidak valid' }, { status: 400 });
    const end = d.end_at ? new Date(d.end_at) : null;
    if (end && isNaN(end.getTime())) return NextResponse.json({ error: 'Tanggal selesai tidak valid' }, { status: 400 });
    if (end && end.getTime() < start.getTime()) return NextResponse.json({ error: 'Waktu selesai harus setelah mulai' }, { status: 400 });

    let ownerId = userId;
    if (d.owner_id && d.owner_id !== userId) {
      if (viewer.role === 'admin') {
        ownerId = d.owner_id;
      } else if (viewer.role === 'manager') {
        const target = getUserById(d.owner_id);
        if (!target || !viewer.divisi || target.divisi !== viewer.divisi) {
          return NextResponse.json({ error: 'Manager hanya bisa membuat jadwal untuk divisinya' }, { status: 403 });
        }
        ownerId = d.owner_id;
      } else {
        return NextResponse.json({ error: 'Forbidden — tidak bisa membuat jadwal untuk orang lain' }, { status: 403 });
      }
    }
    const owner = getUserById(ownerId);
    if (!owner) return NextResponse.json({ error: 'Pemilik jadwal tidak ditemukan' }, { status: 404 });

    const visibility = d.visibility ?? 'private';
    if (visibility === 'division' && !owner.divisi) {
      return NextResponse.json({ error: 'Divisi pemilik kosong — pilih "Semua" atau "Orang tertentu"' }, { status: 400 });
    }

    let sharedUserIds: string[] = [];
    if (visibility === 'custom') {
      sharedUserIds = Array.from(new Set((d.shared_user_ids ?? []).filter(id => id !== ownerId && !!getUserById(id))));
      if (sharedUserIds.length === 0) {
        return NextResponse.json({ error: 'Pilih minimal satu orang untuk dibagikan' }, { status: 400 });
      }
    }

    const event = createCalendarEvent({
      user_id: ownerId,
      title: d.title,
      note: d.note ?? null,
      location: d.location ?? null,
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      all_day: d.all_day ?? false,
      color: d.color ?? null,
      visibility,
      shared_user_ids: sharedUserIds,
      created_by_id: userId,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal membuat jadwal';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
